use serde::{Deserialize, Serialize};
use strum::{Display, EnumString};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Display, EnumString)]
pub enum SecurityProtocol {
    #[strum(serialize = "PLAINTEXT")]
    #[serde(rename = "PLAINTEXT")]
    Plaintext,
    #[strum(serialize = "SSL")]
    #[serde(rename = "SSL")]
    Ssl,
    #[strum(serialize = "SASL_PLAINTEXT")]
    #[serde(rename = "SASL_PLAINTEXT")]
    SaslPlaintext,
    #[strum(serialize = "SASL_SSL")]
    #[serde(rename = "SASL_SSL")]
    SaslSsl,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Display, EnumString)]
pub enum SaslMechanism {
    #[strum(serialize = "PLAIN")]
    #[serde(rename = "PLAIN")]
    Plain,
    #[strum(serialize = "SCRAM-SHA-256")]
    #[serde(rename = "SCRAM-SHA-256")]
    ScramSha256,
    #[strum(serialize = "SCRAM-SHA-512")]
    #[serde(rename = "SCRAM-SHA-512")]
    ScramSha512,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Connection {
    pub id: String,
    pub name: String,
    pub bootstrap_servers: String,
    pub security_protocol: SecurityProtocol,
    pub sasl_mechanism: Option<SaslMechanism>,
    pub sasl_username: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewConnection {
    pub name: String,
    pub bootstrap_servers: String,
    pub security_protocol: SecurityProtocol,
    pub sasl_mechanism: Option<SaslMechanism>,
    pub sasl_username: Option<String>,
    pub sasl_password: Option<String>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ConnectionStatus {
    Unknown,
    Reachable,
    Unreachable,
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::str::FromStr;

    #[test]
    fn security_protocol_round_trips_through_display_and_fromstr() {
        for protocol in [
            SecurityProtocol::Plaintext,
            SecurityProtocol::Ssl,
            SecurityProtocol::SaslPlaintext,
            SecurityProtocol::SaslSsl,
        ] {
            let text = protocol.to_string();
            assert_eq!(SecurityProtocol::from_str(&text).unwrap(), protocol);
        }
    }

    #[test]
    fn sasl_mechanism_round_trips_through_display_and_fromstr() {
        for mechanism in [
            SaslMechanism::Plain,
            SaslMechanism::ScramSha256,
            SaslMechanism::ScramSha512,
        ] {
            let text = mechanism.to_string();
            assert_eq!(SaslMechanism::from_str(&text).unwrap(), mechanism);
        }
    }

    #[test]
    fn connection_serializes_fields_as_camel_case() {
        let connection = Connection {
            id: "1".into(),
            name: "Local".into(),
            bootstrap_servers: "localhost:9092".into(),
            security_protocol: SecurityProtocol::Plaintext,
            sasl_mechanism: None,
            sasl_username: None,
            created_at: "now".into(),
            updated_at: "now".into(),
        };
        let json = serde_json::to_string(&connection).unwrap();
        assert!(json.contains("\"bootstrapServers\":\"localhost:9092\""));
        assert!(json.contains("\"securityProtocol\":\"PLAINTEXT\""));
    }
}
