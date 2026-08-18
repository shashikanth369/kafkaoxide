use async_trait::async_trait;
use error_stack::{Result, ResultExt};
use kafkaoxide_core::{AppError, Connection, ConnectionStatus, SaslMechanism, SecurityProtocol};
use rdkafka::consumer::{BaseConsumer, Consumer};
use rdkafka::ClientConfig;
use std::time::Duration;

use crate::config::{build_client_config, client_config};

#[async_trait]
pub trait KafkaClient: Send + Sync {
    /// Checks a saved connection (used for the periodic status dot in the
    /// connection tree).
    async fn check_status(
        &self,
        connection: &Connection,
        password: Option<&str>,
    ) -> Result<ConnectionStatus, AppError>;

    /// Pings just the bootstrap servers value, ignoring security settings.
    /// Backs the ping button next to "Bootstrap servers" in the New
    /// Connection modal's General section.
    async fn ping_bootstrap(&self, bootstrap_servers: &str) -> Result<ConnectionStatus, AppError>;

    /// Tests full connectivity using the in-progress modal's entered
    /// values, before the connection has been saved. Backs the modal's
    /// bottom "Test" button. Note: the New Connection modal's spec has no
    /// SASL username field, so PLAIN/SCRAM mechanisms (which librdkafka
    /// requires a username for) will surface as an `Err` here rather than
    /// `ConnectionStatus::Unreachable` — this is a real config error, not a
    /// failed probe.
    async fn test_connection(
        &self,
        bootstrap_servers: &str,
        security_protocol: SecurityProtocol,
        sasl_mechanism: Option<SaslMechanism>,
        password: Option<&str>,
    ) -> Result<ConnectionStatus, AppError>;
}

async fn run_probe(config: ClientConfig) -> Result<ConnectionStatus, AppError> {
    tokio::task::spawn_blocking(move || {
        let consumer: BaseConsumer = config
            .create()
            .change_context(AppError::Kafka)
            .attach_printable("failed to create kafka consumer")?;

        match consumer.fetch_metadata(None, Duration::from_secs(3)) {
            Ok(_) => Ok(ConnectionStatus::Reachable),
            Err(_) => Ok(ConnectionStatus::Unreachable),
        }
    })
    .await
    .change_context(AppError::Kafka)
    .attach_printable("status check task panicked")?
}

pub struct RdKafkaClient;

#[async_trait]
impl KafkaClient for RdKafkaClient {
    async fn check_status(
        &self,
        connection: &Connection,
        password: Option<&str>,
    ) -> Result<ConnectionStatus, AppError> {
        run_probe(client_config(connection, password)).await
    }

    async fn ping_bootstrap(&self, bootstrap_servers: &str) -> Result<ConnectionStatus, AppError> {
        run_probe(build_client_config(
            bootstrap_servers,
            SecurityProtocol::Plaintext,
            None,
            None,
        ))
        .await
    }

    async fn test_connection(
        &self,
        bootstrap_servers: &str,
        security_protocol: SecurityProtocol,
        sasl_mechanism: Option<SaslMechanism>,
        password: Option<&str>,
    ) -> Result<ConnectionStatus, AppError> {
        run_probe(build_client_config(
            bootstrap_servers,
            security_protocol,
            sasl_mechanism,
            password,
        ))
        .await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_connection() -> Connection {
        Connection {
            id: "1".into(),
            name: "test".into(),
            bootstrap_servers: "127.0.0.1:1".into(),
            kafka_version: "3.7".into(),
            zookeeper_enabled: false,
            zookeeper_host: None,
            zookeeper_port: None,
            zookeeper_chroot_path: None,
            security_protocol: SecurityProtocol::Plaintext,
            sasl_mechanism: None,
            sasl_oauth_url: None,
            schema_registry_endpoint: None,
            schema_registry_trust_store_location: None,
            schema_registry_keystore_location: None,
            created_at: "now".into(),
            updated_at: "now".into(),
        }
    }

    #[tokio::test]
    async fn reports_unreachable_for_a_closed_port() {
        let client = RdKafkaClient;
        let status = client.check_status(&sample_connection(), None).await.unwrap();
        assert_eq!(status, ConnectionStatus::Unreachable);
    }

    #[tokio::test]
    async fn ping_bootstrap_reports_unreachable_for_a_closed_port() {
        let client = RdKafkaClient;
        let status = client.ping_bootstrap("127.0.0.1:1").await.unwrap();
        assert_eq!(status, ConnectionStatus::Unreachable);
    }

    #[tokio::test]
    async fn test_connection_reports_unreachable_for_a_closed_port() {
        // PLAINTEXT: the only security protocol this sandbox's librdkafka
        // build (no OpenSSL, no libsasl2) can actually probe end-to-end.
        // SASL/SSL protocol pass-through is covered at the config-building
        // level instead, in `config::tests`.
        let client = RdKafkaClient;
        let status = client
            .test_connection("127.0.0.1:1", SecurityProtocol::Plaintext, None, None)
            .await
            .unwrap();
        assert_eq!(status, ConnectionStatus::Unreachable);
    }

    #[tokio::test]
    async fn test_connection_surfaces_a_config_error_for_sasl_mechanisms_that_need_credentials() {
        // PLAIN/SCRAM mechanisms need sasl.username, which this app's data
        // model does not currently collect (see the New Connection modal
        // spec) — librdkafka refuses to even build a client, which is
        // surfaced as an error rather than misreported as "unreachable".
        let client = RdKafkaClient;
        let result = client
            .test_connection(
                "127.0.0.1:1",
                SecurityProtocol::SaslPlaintext,
                Some(SaslMechanism::Plain),
                None,
            )
            .await;
        assert!(result.is_err());
    }
}
