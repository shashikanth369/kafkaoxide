use async_trait::async_trait;
use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use error_stack::{Result, ResultExt};
use kafkaoxide_core::{
    AppError, BrokerSummary, Connection, ConnectionStatus, ConsumerGroupSummary, MessageFilter,
    SaslMechanism, SecurityProtocol, TopicMessage, TopicSummary,
};
use rdkafka::consumer::{BaseConsumer, Consumer};
use rdkafka::topic_partition_list::{Offset, TopicPartitionList};
use rdkafka::{ClientConfig, Message};
use std::collections::BTreeMap;
use std::time::Duration;

use crate::config::{build_client_config, client_config};
use crate::messages::{apply_total_cap, partition_limits};

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

    /// Backs the topic Data tab's Play button. Pulls message metadata (plus
    /// base64 payload — decoded/rendered client-side when a row is
    /// clicked) applying the given filters; an all-`None` filter pulls
    /// everything. Bounded/historical, not a live tail: partition
    /// start/end offsets are resolved once up front (from watermarks, or
    /// from the from/to timestamps via `offsets_for_times`), so messages
    /// produced after the fetch starts are not included.
    async fn fetch_messages(
        &self,
        connection: &Connection,
        topic: &str,
        filter: &MessageFilter,
        password: Option<&str>,
    ) -> Result<Vec<TopicMessage>, AppError>;
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

    async fn fetch_messages(
        &self,
        connection: &Connection,
        topic: &str,
        filter: &MessageFilter,
        password: Option<&str>,
    ) -> Result<Vec<TopicMessage>, AppError> {
        let mut config = client_config(connection, password);
        config.set("group.id", "kafkaoxide-message-browser");
        config.set("enable.auto.commit", "false");
        let topic = topic.to_string();
        let filter = filter.clone();

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

            let target_partitions: Vec<i32> = match &filter.partitions {
                Some(partitions) => partitions.clone(),
                None => topic_metadata.partitions().iter().map(|p| p.id()).collect(),
            };

            let watermarks = |partition: i32| -> Result<(i64, i64), AppError> {
                consumer
                    .fetch_watermarks(&topic, partition, METADATA_TIMEOUT)
                    .change_context(AppError::Kafka)
                    .attach_printable_lazy(|| format!("failed to fetch watermarks for {topic}:{partition}"))
            };

            let start_offsets: BTreeMap<i32, i64> = if let Some(from_ms) = filter.from_timestamp_ms {
                resolve_offsets_by_timestamp(&consumer, &topic, &target_partitions, from_ms, |p| {
                    watermarks(p).map(|(low, _)| low)
                })?
            } else {
                target_partitions
                    .iter()
                    .map(|&p| watermarks(p).map(|(low, _)| (p, low)))
                    .collect::<Result<_, _>>()?
            };

            let end_offsets: BTreeMap<i32, i64> = if let Some(to_ms) = filter.to_timestamp_ms {
                resolve_offsets_by_timestamp(&consumer, &topic, &target_partitions, to_ms, |p| {
                    watermarks(p).map(|(_, high)| high)
                })?
            } else {
                target_partitions
                    .iter()
                    .map(|&p| watermarks(p).map(|(_, high)| (p, high)))
                    .collect::<Result<_, _>>()?
            };

            let limits = partition_limits(&start_offsets, &end_offsets, filter.max_messages_per_partition);
            let limits = apply_total_cap(&limits, filter.max_total_messages);

            let mut assign_tpl = TopicPartitionList::new();
            for (&partition, &limit) in &limits {
                if limit > 0 {
                    let start = start_offsets.get(&partition).copied().unwrap_or(0);
                    assign_tpl
                        .add_partition_offset(&topic, partition, Offset::Offset(start))
                        .change_context(AppError::Kafka)
                        .attach_printable("failed to build partition assignment")?;
                }
            }
            consumer
                .assign(&assign_tpl)
                .change_context(AppError::Kafka)
                .attach_printable("failed to assign partitions")?;

            let total_target: i64 = limits.values().sum();
            let mut remaining = limits;
            let mut collected = Vec::new();
            const POLL_TIMEOUT: Duration = Duration::from_millis(500);
            const IDLE_TIMEOUT: Duration = Duration::from_secs(10);
            let mut idle_elapsed = Duration::ZERO;

            while (collected.len() as i64) < total_target && idle_elapsed < IDLE_TIMEOUT {
                match consumer.poll(POLL_TIMEOUT) {
                    Some(Ok(borrowed)) => {
                        idle_elapsed = Duration::ZERO;
                        let partition = borrowed.partition();
                        let budget = remaining.get(&partition).copied().unwrap_or(0);
                        if budget <= 0 {
                            continue;
                        }
                        collected.push(TopicMessage {
                            partition,
                            offset: borrowed.offset(),
                            timestamp_ms: borrowed.timestamp().to_millis(),
                            key: borrowed.key().map(|k| String::from_utf8_lossy(k).into_owned()),
                            payload_base64: BASE64.encode(borrowed.payload().unwrap_or(&[])),
                        });
                        remaining.insert(partition, budget - 1);
                    }
                    Some(Err(_)) | None => {
                        idle_elapsed += POLL_TIMEOUT;
                    }
                }
            }

            Ok(collected)
        })
        .await
        .change_context(AppError::Kafka)
        .attach_printable("fetch_messages task panicked")?
    }
}

/// Resolves each target partition's offset at `timestamp_ms` via
/// `offsets_for_times`, falling back to `fallback` (a watermark lookup) for
/// any partition librdkafka couldn't resolve to a concrete offset (e.g. the
/// timestamp is after every message in the partition).
fn resolve_offsets_by_timestamp(
    consumer: &BaseConsumer,
    topic: &str,
    partitions: &[i32],
    timestamp_ms: i64,
    fallback: impl Fn(i32) -> Result<i64, AppError>,
) -> Result<BTreeMap<i32, i64>, AppError> {
    let mut request = TopicPartitionList::new();
    for &partition in partitions {
        request
            .add_partition_offset(topic, partition, Offset::Offset(timestamp_ms))
            .change_context(AppError::Kafka)
            .attach_printable("failed to build offsets_for_times request")?;
    }

    let resolved = consumer
        .offsets_for_times(request, METADATA_TIMEOUT)
        .change_context(AppError::Kafka)
        .attach_printable("failed to resolve timestamp to offsets")?;

    let mut result = BTreeMap::new();
    for partition in partitions {
        let raw_offset = resolved
            .elements_for_topic(topic)
            .into_iter()
            .find(|elem| elem.partition() == *partition)
            .and_then(|elem| elem.offset().to_raw())
            .filter(|&offset| offset >= 0);

        let offset = match raw_offset {
            Some(offset) => offset,
            None => fallback(*partition)?,
        };
        result.insert(*partition, offset);
    }
    Ok(result)
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
    async fn fetch_messages_errors_for_a_closed_port() {
        let client = RdKafkaClient;
        let result = client
            .fetch_messages(&sample_connection(), "orders", &MessageFilter::default(), None)
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
