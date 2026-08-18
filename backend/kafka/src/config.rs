use kafkaoxide_core::Connection;
use rdkafka::ClientConfig;

pub fn client_config(connection: &Connection, password: Option<&str>) -> ClientConfig {
    let mut config = ClientConfig::new();
    config.set("bootstrap.servers", &connection.bootstrap_servers);
    config.set(
        "security.protocol",
        connection.security_protocol.to_string().to_lowercase(),
    );

    if let Some(mechanism) = &connection.sasl_mechanism {
        config.set("sasl.mechanism", mechanism.to_string());
        if let Some(username) = &connection.sasl_username {
            config.set("sasl.username", username);
        }
        if let Some(password) = password {
            config.set("sasl.password", password);
        }
    }

    config
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
            security_protocol: SecurityProtocol::SaslSsl,
            sasl_mechanism: Some(SaslMechanism::ScramSha256),
            sasl_username: Some("alice".into()),
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
        assert_eq!(config.get("sasl.username"), Some("alice"));
        assert_eq!(config.get("sasl.password"), Some("hunter2"));
    }

    #[test]
    fn omits_sasl_fields_for_plaintext() {
        let mut connection = sample_connection();
        connection.security_protocol = SecurityProtocol::Plaintext;
        connection.sasl_mechanism = None;
        connection.sasl_username = None;

        let config = client_config(&connection, None);
        assert_eq!(config.get("sasl.mechanism"), None);
    }
}
