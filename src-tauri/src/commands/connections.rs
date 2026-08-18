use crate::state::AppState;
use kafkaoxide_core::{Connection, ConnectionStatus, NewConnection};
use kafkaoxide_kafka::{KafkaClient, ZookeeperClient};
use kafkaoxide_secrets::SecretStore;
use tauri::{AppHandle, State};

#[derive(serde::Serialize)]
pub struct CommandError {
    pub message: String,
}

impl From<error_stack::Report<kafkaoxide_core::AppError>> for CommandError {
    fn from(report: error_stack::Report<kafkaoxide_core::AppError>) -> Self {
        CommandError {
            message: format!("{report:?}"),
        }
    }
}

/// The New Connection modal's Schema Registry secret fields, each stored
/// under its own keyed slot in the OS keychain (see
/// `kafkaoxide_secrets::SecretStore`) rather than in the database.
const SCHEMA_REGISTRY_SECRET_KEYS: [&str; 4] = [
    "schema_registry_basic_auth_credentials",
    "schema_registry_trust_store_password",
    "schema_registry_keystore_password",
    "schema_registry_keystore_key_password",
];

fn schema_registry_secret_values(new_connection: &NewConnection) -> [Option<&str>; 4] {
    [
        new_connection.schema_registry_basic_auth_credentials.as_deref(),
        new_connection.schema_registry_trust_store_password.as_deref(),
        new_connection.schema_registry_keystore_password.as_deref(),
        new_connection.schema_registry_keystore_key_password.as_deref(),
    ]
}

fn store_schema_registry_secrets(
    state: &AppState,
    connection_id: &str,
    new_connection: &NewConnection,
) -> Result<(), CommandError> {
    for (key, value) in SCHEMA_REGISTRY_SECRET_KEYS
        .iter()
        .zip(schema_registry_secret_values(new_connection))
    {
        match value {
            Some(value) => state.secrets.set_secret(connection_id, key, value)?,
            None => state.secrets.delete_secret(connection_id, key)?,
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn connection_list(state: State<'_, AppState>) -> Result<Vec<Connection>, CommandError> {
    Ok(kafkaoxide_db::connections::list(&state.pool).await?)
}

#[tauri::command]
pub async fn connection_create(
    app: AppHandle,
    state: State<'_, AppState>,
    new_connection: NewConnection,
) -> Result<Connection, CommandError> {
    let connection = kafkaoxide_db::connections::create(&state.pool, &new_connection).await?;
    store_schema_registry_secrets(&state, &connection.id, &new_connection)?;
    crate::logging::emit_log(&app, "info", format!("Created connection \"{}\"", connection.name));
    Ok(connection)
}

#[tauri::command]
pub async fn connection_update(
    app: AppHandle,
    state: State<'_, AppState>,
    id: String,
    new_connection: NewConnection,
) -> Result<Connection, CommandError> {
    let connection = kafkaoxide_db::connections::update(&state.pool, &id, &new_connection).await?;
    store_schema_registry_secrets(&state, &connection.id, &new_connection)?;
    crate::logging::emit_log(&app, "info", format!("Updated connection \"{}\"", connection.name));
    Ok(connection)
}

#[tauri::command]
pub async fn connection_delete(
    app: AppHandle,
    state: State<'_, AppState>,
    id: String,
) -> Result<(), CommandError> {
    kafkaoxide_db::connections::delete(&state.pool, &id).await?;
    for key in SCHEMA_REGISTRY_SECRET_KEYS {
        state.secrets.delete_secret(&id, key)?;
    }
    state.connections.mark_disconnected(&id);
    crate::logging::emit_log(&app, "info", format!("Deleted connection {id}"));
    Ok(())
}

#[tauri::command]
pub async fn connection_check_status(
    state: State<'_, AppState>,
    id: String,
) -> Result<ConnectionStatus, CommandError> {
    let connection = kafkaoxide_db::connections::get(&state.pool, &id).await?;
    Ok(state.kafka.check_status(&connection, None).await?)
}

/// Backs the ping button next to "Bootstrap servers" in the New Connection
/// modal's General section — a plaintext reachability probe of whatever the
/// user has typed so far, independent of the Security tab.
#[tauri::command]
pub async fn connection_ping_bootstrap(
    state: State<'_, AppState>,
    bootstrap_servers: String,
) -> Result<ConnectionStatus, CommandError> {
    Ok(state.kafka.ping_bootstrap(&bootstrap_servers).await?)
}

/// Backs the ping button next to "Host" in the New Connection modal's
/// Zookeeper section.
#[tauri::command]
pub async fn connection_ping_zookeeper(
    state: State<'_, AppState>,
    host: String,
    port: u16,
) -> Result<ConnectionStatus, CommandError> {
    Ok(state.zookeeper.ping(&host, port).await)
}

/// Backs the New Connection modal's bottom "Test" button — tests
/// connectivity using every value currently entered in the modal, without
/// requiring the connection to be saved first.
#[tauri::command]
pub async fn connection_test(
    state: State<'_, AppState>,
    new_connection: NewConnection,
) -> Result<ConnectionStatus, CommandError> {
    Ok(state
        .kafka
        .test_connection(
            &new_connection.bootstrap_servers,
            new_connection.security_protocol,
            new_connection.sasl_mechanism,
            None,
        )
        .await?)
}

/// Backs the cluster detail panel's "Reconnect" button. Pings the saved
/// connection and, only on success, marks it connected in
/// `AppState::connections` — this is what gates the tree's Brokers/Topics/
/// Consumers expansion and the panel's field-disabling.
#[tauri::command]
pub async fn connection_connect(
    state: State<'_, AppState>,
    id: String,
) -> Result<ConnectionStatus, CommandError> {
    let connection = kafkaoxide_db::connections::get(&state.pool, &id).await?;
    let status = state.kafka.check_status(&connection, None).await?;
    if status == ConnectionStatus::Reachable {
        state.connections.mark_connected(&id);
    }
    Ok(status)
}

/// Backs the cluster detail panel's "Disconnect" button.
#[tauri::command]
pub async fn connection_disconnect(state: State<'_, AppState>, id: String) -> Result<(), CommandError> {
    state.connections.mark_disconnected(&id);
    Ok(())
}

#[tauri::command]
pub async fn connection_is_connected(state: State<'_, AppState>, id: String) -> Result<bool, CommandError> {
    Ok(state.connections.is_connected(&id))
}

/// Backs the tree's "Brokers" sub-list once a cluster is connected.
#[tauri::command]
pub async fn connection_list_brokers(
    state: State<'_, AppState>,
    id: String,
) -> Result<Vec<kafkaoxide_core::BrokerSummary>, CommandError> {
    let connection = kafkaoxide_db::connections::get(&state.pool, &id).await?;
    Ok(state.kafka.list_brokers(&connection, None).await?)
}

/// Backs the tree's "Topics" sub-list once a cluster is connected.
#[tauri::command]
pub async fn connection_list_topics(
    state: State<'_, AppState>,
    id: String,
) -> Result<Vec<kafkaoxide_core::TopicSummary>, CommandError> {
    let connection = kafkaoxide_db::connections::get(&state.pool, &id).await?;
    Ok(state.kafka.list_topics(&connection, None).await?)
}

/// Backs the tree's "Consumers" sub-list once a cluster is connected.
#[tauri::command]
pub async fn connection_list_consumer_groups(
    state: State<'_, AppState>,
    id: String,
) -> Result<Vec<kafkaoxide_core::ConsumerGroupSummary>, CommandError> {
    let connection = kafkaoxide_db::connections::get(&state.pool, &id).await?;
    Ok(state.kafka.list_consumer_groups(&connection, None).await?)
}

/// Backs the topic detail panel's Properties > Messages "Refresh" button.
#[tauri::command]
pub async fn connection_count_topic_messages(
    state: State<'_, AppState>,
    id: String,
    topic: String,
) -> Result<u64, CommandError> {
    let connection = kafkaoxide_db::connections::get(&state.pool, &id).await?;
    Ok(state.kafka.count_topic_messages(&connection, &topic, None).await?)
}

/// Backs the topic Data tab's Play button.
#[tauri::command]
pub async fn connection_fetch_messages(
    state: State<'_, AppState>,
    id: String,
    topic: String,
    filter: kafkaoxide_core::MessageFilter,
) -> Result<Vec<kafkaoxide_core::TopicMessage>, CommandError> {
    let connection = kafkaoxide_db::connections::get(&state.pool, &id).await?;
    Ok(state.kafka.fetch_messages(&connection, &topic, &filter, None).await?)
}

/// Backs the topic detail panel's Partitions tab.
#[tauri::command]
pub async fn connection_list_partitions(
    state: State<'_, AppState>,
    id: String,
    topic: String,
) -> Result<Vec<kafkaoxide_core::PartitionSummary>, CommandError> {
    let connection = kafkaoxide_db::connections::get(&state.pool, &id).await?;
    Ok(state.kafka.list_partitions(&connection, &topic, None).await?)
}

/// Backs the topic detail panel's Config tab.
#[tauri::command]
pub async fn connection_describe_topic_config(
    state: State<'_, AppState>,
    id: String,
    topic: String,
) -> Result<Vec<kafkaoxide_core::ConfigEntry>, CommandError> {
    let connection = kafkaoxide_db::connections::get(&state.pool, &id).await?;
    Ok(state.kafka.describe_topic_config(&connection, &topic, None).await?)
}
