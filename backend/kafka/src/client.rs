use async_trait::async_trait;
use error_stack::{Result, ResultExt};
use kafkaoxide_core::{
    AppError, BrokerSummary, Connection, ConnectionStatus, ConsumerGroupSummary, SaslMechanism,
    SecurityProtocol, TopicSummary,
};
use rdkafka::consumer::{BaseConsumer, Consumer};
use rdkafka::ClientConfig;
use std::time::Duration;

use crate::config::{build_client_config, client_config};

const METADATA_TIMEOUT: Duration = Duration::from_secs(5);

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

    /// Backs the tree's "Brokers" sub-list once a cluster is connected.
    async fn list_brokers(
        &self,
        connection: &Connection,
        password: Option<&str>,
    ) -> Result<Vec<BrokerSummary>, AppError>;

    /// Backs the tree's "Topics" sub-list once a cluster is connected.
    async fn list_topics(
        &self,
        connection: &Connection,
        password: Option<&str>,
    ) -> Result<Vec<TopicSummary>, AppError>;

    /// Backs the tree's "Consumers" sub-list once a cluster is connected.
    async fn list_consumer_groups(
        &self,
        connection: &Connection,
        password: Option<&str>,
    ) -> Result<Vec<ConsumerGroupSummary>, AppError>;

    /// Sums (high watermark - low watermark) across every partition of the
    /// topic. Backs the topic detail panel's Properties > Messages section,
    /// which fetches this lazily only when its Refresh button is clicked —
    /// never on tab open, since this can be an expensive per-partition call
    /// on a topic with many partitions.
    async fn count_topic_messages(
        &self,
        connection: &Connection,
        topic: &str,
        password: Option<&str>,
    ) -> Result<u64, AppError>;
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

    async fn list_brokers(
        &self,
        connection: &Connection,
        password: Option<&str>,
    ) -> Result<Vec<BrokerSummary>, AppError> {
        let config = client_config(connection, password);
        tokio::task::spawn_blocking(move || {
            let consumer: BaseConsumer = config
                .create()
                .change_context(AppError::Kafka)
                .attach_printable("failed to create kafka consumer")?;
            let metadata = consumer
                .fetch_metadata(None, METADATA_TIMEOUT)
                .change_context(AppError::Kafka)
                .attach_printable("failed to fetch broker metadata")?;

            Ok(metadata
                .brokers()
                .iter()
                .map(|broker| BrokerSummary {
                    id: broker.id(),
                    host: broker.host().to_string(),
                    port: broker.port(),
                })
                .collect())
        })
        .await
        .change_context(AppError::Kafka)
        .attach_printable("list_brokers task panicked")?
    }

    async fn list_topics(
        &self,
        connection: &Connection,
        password: Option<&str>,
    ) -> Result<Vec<TopicSummary>, AppError> {
        let config = client_config(connection, password);
        tokio::task::spawn_blocking(move || {
            let consumer: BaseConsumer = config
                .create()
                .change_context(AppError::Kafka)
                .attach_printable("failed to create kafka consumer")?;
            let metadata = consumer
                .fetch_metadata(None, METADATA_TIMEOUT)
                .change_context(AppError::Kafka)
                .attach_printable("failed to fetch topic metadata")?;

            Ok(metadata
                .topics()
                .iter()
                .map(|topic| TopicSummary {
                    name: topic.name().to_string(),
                    partition_count: topic.partitions().len(),
                })
                .collect())
        })
        .await
        .change_context(AppError::Kafka)
        .attach_printable("list_topics task panicked")?
    }

    async fn list_consumer_groups(
        &self,
        connection: &Connection,
        password: Option<&str>,
    ) -> Result<Vec<ConsumerGroupSummary>, AppError> {
        let config = client_config(connection, password);
        tokio::task::spawn_blocking(move || {
            let consumer: BaseConsumer = config
                .create()
                .change_context(AppError::Kafka)
                .attach_printable("failed to create kafka consumer")?;
            let groups = consumer
                .fetch_group_list(None, METADATA_TIMEOUT)
                .change_context(AppError::Kafka)
                .attach_printable("failed to fetch consumer group list")?;

            Ok(groups
                .groups()
                .iter()
                .map(|group| ConsumerGroupSummary {
                    group_id: group.name().to_string(),
                    state: group.state().to_string(),
                })
                .collect())
        })
        .await
        .change_context(AppError::Kafka)
        .attach_printable("list_consumer_groups task panicked")?
    }

    async fn count_topic_messages(
        &self,
        connection: &Connection,
        topic: &str,
        password: Option<&str>,
    ) -> Result<u64, AppError> {
        let config = client_config(connection, password);
        let topic = topic.to_string();
        tokio::task::spawn_blocking(move || {
            let consumer: BaseConsumer = config
                .create()
                .change_context(AppError::Kafka)
                .attach_printable("failed to create kafka consumer")?;
            let metadata = consumer
                .fetch_metadata(Some(&topic), METADATA_TIMEOUT)
                .change_context(AppError::Kafka)
                .attach_printable_lazy(|| format!("failed to fetch metadata for topic {topic}"))?;
            let topic_metadata = metadata
                .topics()
                .iter()
                .find(|t| t.name() == topic)
                .ok_or_else(|| error_stack::Report::new(AppError::NotFound))
                .attach_printable_lazy(|| format!("topic {topic} not found"))?;

            let mut total: u64 = 0;
            for partition in topic_metadata.partitions() {
                let (low, high) = consumer
                    .fetch_watermarks(&topic, partition.id(), METADATA_TIMEOUT)
                    .change_context(AppError::Kafka)
                    .attach_printable_lazy(|| {
                        format!("failed to fetch watermarks for {topic}:{}", partition.id())
                    })?;
                total += (high - low).max(0) as u64;
            }
            Ok(total)
        })
        .await
        .change_context(AppError::Kafka)
        .attach_printable("count_topic_messages task panicked")?
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
    async fn list_brokers_errors_for_a_closed_port() {
        let client = RdKafkaClient;
        let result = client.list_brokers(&sample_connection(), None).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn list_topics_errors_for_a_closed_port() {
        let client = RdKafkaClient;
        let result = client.list_topics(&sample_connection(), None).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn list_consumer_groups_errors_for_a_closed_port() {
        let client = RdKafkaClient;
        let result = client.list_consumer_groups(&sample_connection(), None).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn count_topic_messages_errors_for_a_closed_port() {
        let client = RdKafkaClient;
        let result = client
            .count_topic_messages(&sample_connection(), "orders", None)
            .await;
        assert!(result.is_err());
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
