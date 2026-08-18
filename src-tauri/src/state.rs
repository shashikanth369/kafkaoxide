use kafkaoxide_kafka::KafkaClient;
use kafkaoxide_secrets::SecretStore;
use sqlx::sqlite::SqlitePool;
use std::sync::Arc;

pub struct AppState {
    pub pool: SqlitePool,
    pub kafka: Arc<dyn KafkaClient>,
    pub secrets: Arc<dyn SecretStore>,
}
