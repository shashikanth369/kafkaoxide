use serde::{Deserialize, Serialize};

/// One entry in the tree's "Brokers" sub-list, once a cluster is connected.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct BrokerSummary {
    pub id: i32,
    pub host: String,
    pub port: i32,
}

/// One entry in the tree's "Topics" sub-list.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TopicSummary {
    pub name: String,
    pub partition_count: usize,
}

/// One entry in the tree's "Consumers" sub-list.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ConsumerGroupSummary {
    pub group_id: String,
    pub state: String,
}

/// One row in the topic detail panel's Partitions tab.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PartitionSummary {
    pub id: i32,
    pub leader: i32,
    pub replicas: Vec<i32>,
    pub isr: Vec<i32>,
    pub low_offset: i64,
    pub high_offset: i64,
}

/// One row in the topic detail panel's Config tab.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ConfigEntry {
    pub name: String,
    pub value: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn broker_summary_serializes_fields_as_camel_case() {
        let broker = BrokerSummary { id: 1, host: "broker1".into(), port: 9092 };
        let json = serde_json::to_string(&broker).unwrap();
        assert_eq!(json, r#"{"id":1,"host":"broker1","port":9092}"#);
    }

    #[test]
    fn topic_summary_serializes_fields_as_camel_case() {
        let topic = TopicSummary { name: "orders".into(), partition_count: 6 };
        let json = serde_json::to_string(&topic).unwrap();
        assert_eq!(json, r#"{"name":"orders","partitionCount":6}"#);
    }

    #[test]
    fn consumer_group_summary_serializes_fields_as_camel_case() {
        let group = ConsumerGroupSummary { group_id: "billing".into(), state: "Stable".into() };
        let json = serde_json::to_string(&group).unwrap();
        assert_eq!(json, r#"{"groupId":"billing","state":"Stable"}"#);
    }

    #[test]
    fn partition_summary_serializes_fields_as_camel_case() {
        let partition = PartitionSummary {
            id: 0,
            leader: 1,
            replicas: vec![1, 2, 3],
            isr: vec![1, 2],
            low_offset: 0,
            high_offset: 100,
        };
        let json = serde_json::to_string(&partition).unwrap();
        assert_eq!(
            json,
            r#"{"id":0,"leader":1,"replicas":[1,2,3],"isr":[1,2],"lowOffset":0,"highOffset":100}"#
        );
    }

    #[test]
    fn config_entry_serializes_fields_as_camel_case() {
        let entry = ConfigEntry { name: "retention.ms".into(), value: Some("604800000".into()) };
        let json = serde_json::to_string(&entry).unwrap();
        assert_eq!(json, r#"{"name":"retention.ms","value":"604800000"}"#);
    }
}
