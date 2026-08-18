use chrono::Utc;
use error_stack::{Result, ResultExt};
use kafkaoxide_core::{AppError, Connection, NewConnection, SaslMechanism, SecurityProtocol};
use sqlx::sqlite::SqlitePool;
use sqlx::FromRow;
use std::str::FromStr;
use uuid::Uuid;

#[derive(FromRow)]
struct ConnectionRow {
    id: String,
    name: String,
    bootstrap_servers: String,
    security_protocol: String,
    sasl_mechanism: Option<String>,
    sasl_username: Option<String>,
    created_at: String,
    updated_at: String,
}

impl ConnectionRow {
    fn into_connection(self) -> Result<Connection, AppError> {
        let security_protocol = SecurityProtocol::from_str(&self.security_protocol)
            .change_context(AppError::Db)
            .attach_printable_lazy(|| format!("invalid security_protocol {}", self.security_protocol))?;
        let sasl_mechanism = self
            .sasl_mechanism
            .as_deref()
            .map(SaslMechanism::from_str)
            .transpose()
            .change_context(AppError::Db)
            .attach_printable("invalid sasl_mechanism")?;
        Ok(Connection {
            id: self.id,
            name: self.name,
            bootstrap_servers: self.bootstrap_servers,
            security_protocol,
            sasl_mechanism,
            sasl_username: self.sasl_username,
            created_at: self.created_at,
            updated_at: self.updated_at,
        })
    }
}

pub async fn create(pool: &SqlitePool, new_conn: &NewConnection) -> Result<Connection, AppError> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let security_protocol = new_conn.security_protocol.to_string();
    let sasl_mechanism = new_conn.sasl_mechanism.map(|m| m.to_string());

    sqlx::query(
        "INSERT INTO connections (id, name, bootstrap_servers, security_protocol, sasl_mechanism, sasl_username, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)",
    )
    .bind(&id)
    .bind(&new_conn.name)
    .bind(&new_conn.bootstrap_servers)
    .bind(&security_protocol)
    .bind(&sasl_mechanism)
    .bind(&new_conn.sasl_username)
    .bind(&now)
    .execute(pool)
    .await
    .change_context(AppError::Db)
    .attach_printable("failed to insert connection")?;

    get(pool, &id).await
}

pub async fn get(pool: &SqlitePool, id: &str) -> Result<Connection, AppError> {
    let row = sqlx::query_as::<_, ConnectionRow>("SELECT * FROM connections WHERE id = ?1")
        .bind(id)
        .fetch_optional(pool)
        .await
        .change_context(AppError::Db)
        .attach_printable_lazy(|| format!("failed to fetch connection {id}"))?;

    let row = match row {
        Some(row) => row,
        None => {
            return Err(error_stack::Report::new(AppError::NotFound))
                .attach_printable_lazy(|| format!("connection {id} not found"));
        }
    };

    row.into_connection()
}

pub async fn list(pool: &SqlitePool) -> Result<Vec<Connection>, AppError> {
    let rows = sqlx::query_as::<_, ConnectionRow>("SELECT * FROM connections ORDER BY created_at ASC")
        .fetch_all(pool)
        .await
        .change_context(AppError::Db)
        .attach_printable("failed to list connections")?;

    rows.into_iter().map(ConnectionRow::into_connection).collect()
}

pub async fn update(pool: &SqlitePool, id: &str, new_conn: &NewConnection) -> Result<Connection, AppError> {
    let now = Utc::now().to_rfc3339();
    let security_protocol = new_conn.security_protocol.to_string();
    let sasl_mechanism = new_conn.sasl_mechanism.map(|m| m.to_string());

    let result = sqlx::query(
        "UPDATE connections SET name = ?1, bootstrap_servers = ?2, security_protocol = ?3, sasl_mechanism = ?4, sasl_username = ?5, updated_at = ?6
         WHERE id = ?7",
    )
    .bind(&new_conn.name)
    .bind(&new_conn.bootstrap_servers)
    .bind(&security_protocol)
    .bind(&sasl_mechanism)
    .bind(&new_conn.sasl_username)
    .bind(&now)
    .bind(id)
    .execute(pool)
    .await
    .change_context(AppError::Db)
    .attach_printable_lazy(|| format!("failed to update connection {id}"))?;

    if result.rows_affected() == 0 {
        return Err(error_stack::Report::new(AppError::NotFound))
            .attach_printable_lazy(|| format!("connection {id} not found"));
    }

    get(pool, id).await
}

pub async fn delete(pool: &SqlitePool, id: &str) -> Result<(), AppError> {
    let result = sqlx::query("DELETE FROM connections WHERE id = ?1")
        .bind(id)
        .execute(pool)
        .await
        .change_context(AppError::Db)
        .attach_printable_lazy(|| format!("failed to delete connection {id}"))?;

    if result.rows_affected() == 0 {
        return Err(error_stack::Report::new(AppError::NotFound))
            .attach_printable_lazy(|| format!("connection {id} not found"));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePoolOptions;

    async fn test_pool() -> SqlitePool {
        let pool = SqlitePoolOptions::new()
            .connect("sqlite::memory:")
            .await
            .unwrap();
        sqlx::migrate!("./migrations").run(&pool).await.unwrap();
        pool
    }

    fn plaintext_connection(name: &str) -> NewConnection {
        NewConnection {
            name: name.to_string(),
            bootstrap_servers: "localhost:9092".to_string(),
            security_protocol: SecurityProtocol::Plaintext,
            sasl_mechanism: None,
            sasl_username: None,
            sasl_password: None,
        }
    }

    #[tokio::test]
    async fn creates_and_fetches_a_connection() {
        let pool = test_pool().await;
        let created = create(&pool, &plaintext_connection("Local")).await.unwrap();

        assert_eq!(created.name, "Local");
        assert_eq!(created.security_protocol, SecurityProtocol::Plaintext);

        let fetched = get(&pool, &created.id).await.unwrap();
        assert_eq!(fetched, created);
    }

    #[tokio::test]
    async fn lists_connections_in_creation_order() {
        let pool = test_pool().await;
        create(&pool, &plaintext_connection("First")).await.unwrap();
        create(&pool, &plaintext_connection("Second")).await.unwrap();

        let connections = list(&pool).await.unwrap();
        assert_eq!(connections.len(), 2);
        assert_eq!(connections[0].name, "First");
        assert_eq!(connections[1].name, "Second");
    }

    #[tokio::test]
    async fn updates_a_connection() {
        let pool = test_pool().await;
        let created = create(&pool, &plaintext_connection("Local")).await.unwrap();

        let mut update_data = plaintext_connection("Renamed");
        update_data.security_protocol = SecurityProtocol::SaslSsl;
        update_data.sasl_mechanism = Some(SaslMechanism::ScramSha256);
        update_data.sasl_username = Some("alice".to_string());

        let updated = update(&pool, &created.id, &update_data).await.unwrap();

        assert_eq!(updated.name, "Renamed");
        assert_eq!(updated.security_protocol, SecurityProtocol::SaslSsl);
        assert_eq!(updated.sasl_mechanism, Some(SaslMechanism::ScramSha256));
    }

    #[tokio::test]
    async fn update_of_missing_connection_returns_not_found() {
        let pool = test_pool().await;
        let result = update(&pool, "missing-id", &plaintext_connection("X")).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn deletes_a_connection() {
        let pool = test_pool().await;
        let created = create(&pool, &plaintext_connection("Local")).await.unwrap();

        delete(&pool, &created.id).await.unwrap();

        let connections = list(&pool).await.unwrap();
        assert!(connections.is_empty());
    }
}
