use serde::{Deserialize, Serialize};

/// Filters entered on the topic Data tab. All fields are optional — an
/// all-`None` filter means "pull everything" (per spec: "if filters are
/// empty by default it should pull all messages").
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "camelCase")]
pub struct MessageFilter {
    /// `None` = every partition.
    pub partitions: Option<Vec<i32>>,
    pub max_messages_per_partition: Option<u32>,
    pub max_total_messages: Option<u32>,
    pub from_timestamp_ms: Option<i64>,
    pub to_timestamp_ms: Option<i64>,
}

/// One row in the Data tab's AG Grid. `payload_base64` is decoded/rendered
/// client-side (text, JSON, or Avro-with-Confluent-wire-format detection)
/// when the row is clicked, per spec: "message payload should be shown when
/// clicked on the message in right most tab".
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TopicMessage {
    pub partition: i32,
    pub offset: i64,
    pub timestamp_ms: Option<i64>,
    pub key: Option<String>,
    pub payload_base64: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn message_filter_serializes_fields_as_camel_case_and_defaults_to_all_none() {
        let filter = MessageFilter::default();
        let json = serde_json::to_string(&filter).unwrap();
        assert_eq!(
            json,
            r#"{"partitions":null,"maxMessagesPerPartition":null,"maxTotalMessages":null,"fromTimestampMs":null,"toTimestampMs":null}"#
        );
    }

    #[test]
    fn topic_message_serializes_fields_as_camel_case() {
        let message = TopicMessage {
            partition: 0,
            offset: 42,
            timestamp_ms: Some(1_700_000_000_000),
            key: Some("order-1".into()),
            payload_base64: "eyJpZCI6MX0=".into(),
        };
        let json = serde_json::to_string(&message).unwrap();
        assert_eq!(
            json,
            r#"{"partition":0,"offset":42,"timestampMs":1700000000000,"key":"order-1","payloadBase64":"eyJpZCI6MX0="}"#
        );
    }
}
