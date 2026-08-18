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
}
