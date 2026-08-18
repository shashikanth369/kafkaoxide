use async_trait::async_trait;
use error_stack::{Result, ResultExt};
use kafkaoxide_core::{AppError, Connection, ConnectionStatus};
use rdkafka::consumer::{BaseConsumer, Consumer};
use std::time::Duration;

use crate::config::client_config;

#[async_trait]
pub trait KafkaClient: Send + Sync {
    async fn check_status(
        &self,
        connection: &Connection,
        password: Option<&str>,
    ) -> Result<ConnectionStatus, AppError>;
}

pub struct RdKafkaClient;

#[async_trait]
impl KafkaClient for RdKafkaClient {
    async fn check_status(
        &self,
        connection: &Connection,
        password: Option<&str>,
    ) -> Result<ConnectionStatus, AppError> {
        let config = client_config(connection, password);

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
}

#[cfg(test)]
mod tests {
    use super::*;
    use kafkaoxide_core::SecurityProtocol;

    #[tokio::test]
    async fn reports_unreachable_for_a_closed_port() {
        let connection = Connection {
            id: "1".into(),
            name: "test".into(),
            bootstrap_servers: "127.0.0.1:1".into(),
            security_protocol: SecurityProtocol::Plaintext,
            sasl_mechanism: None,
            sasl_username: None,
            created_at: "now".into(),
            updated_at: "now".into(),
        };
        let client = RdKafkaClient;
        let status = client.check_status(&connection, None).await.unwrap();
        assert_eq!(status, ConnectionStatus::Unreachable);
    }
}
