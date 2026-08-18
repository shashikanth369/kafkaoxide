use kafkaoxide_core::{Connection, SaslMechanism, SecurityProtocol};
use rdkafka::ClientConfig;

/// Builds a `ClientConfig` from raw values rather than a saved `Connection`.
/// Used for the New Connection modal's ping/Test flows, which probe
/// connectivity for values the user has typed but not saved yet.
pub fn build_client_config(
    bootstrap_servers: &str,
    security_protocol: SecurityProtocol,
    sasl_mechanism: Option<SaslMechanism>,
    password: Option<&str>,
) -> ClientConfig {
    let mut config = ClientConfig::new();
    config.set("bootstrap.servers", bootstrap_servers);
    config.set("security.protocol", security_protocol.to_string().to_lowercase());

    if let Some(mechanism) = sasl_mechanism {
        config.set("sasl.mechanism", mechanism.to_string());
        if let Some(password) = password {
            config.set("sasl.password", password);
        }
    }

    config
}

pub fn client_config(connection: &Connection, password: Option<&str>) -> ClientConfig {
    build_client_config(
        &connection.bootstrap_servers,
        connection.security_protocol,
        connection.sasl_mechanism,
        password,
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use kafkaoxide_core::{SaslMechanism, SecurityProtocol};

    fn sample_connection() -> Connection {
        Connection {
            id: "1".into(),
            name: "test".into(),
            bootstrap_servers: "localhost:9092".into(),
            kafka_version: "3.7".into(),
            zookeeper_enabled: false,
            zookeeper_host: None,
            zookeeper_port: None,
            zookeeper_chroot_path: None,
            security_protocol: SecurityProtocol::SaslSsl,
            sasl_mechanism: Some(SaslMechanism::ScramSha256),
            sasl_oauth_url: None,
            schema_registry_endpoint: None,
            schema_registry_trust_store_location: None,
            schema_registry_keystore_location: None,
            created_at: "now".into(),
            updated_at: "now".into(),
        }
    }

    #[test]
    fn builds_bootstrap_servers_and_security_protocol() {
        let config = client_config(&sample_connection(), None);
        assert_eq!(config.get("bootstrap.servers"), Some("localhost:9092"));
        assert_eq!(config.get("security.protocol"), Some("sasl_ssl"));
    }

    #[test]
    fn builds_sasl_fields_when_password_given() {
        let config = client_config(&sample_connection(), Some("hunter2"));
        assert_eq!(config.get("sasl.mechanism"), Some("SCRAM-SHA-256"));
        assert_eq!(config.get("sasl.password"), Some("hunter2"));
    }

    #[test]
    fn omits_sasl_fields_for_plaintext() {
        let mut connection = sample_connection();
        connection.security_protocol = SecurityProtocol::Plaintext;
        connection.sasl_mechanism = None;

        let config = client_config(&connection, None);
        assert_eq!(config.get("sasl.mechanism"), None);
    }
}
