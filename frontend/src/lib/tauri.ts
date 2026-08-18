import { invoke } from "@tauri-apps/api/core";

export type SecurityProtocol = "PLAINTEXT" | "SSL" | "SASL_PLAINTEXT" | "SASL_SSL";
export type SaslMechanism = "PLAIN" | "SCRAM-SHA-256" | "SCRAM-SHA-512";
export type ConnectionStatus = "UNKNOWN" | "REACHABLE" | "UNREACHABLE";

/** Values for the General section's "Kafka cluster version" dropdown. */
export const KAFKA_VERSIONS = [
  "0.11",
  "1.0",
  "1.1",
  "2.0",
  "2.1",
  "2.2",
  "2.3",
  "2.4",
  "2.5",
  "2.6",
  "2.7",
  "2.8",
  "2.9",
  "3.0",
  "3.1",
  "3.2",
  "3.3",
  "3.4",
  "3.5",
  "3.6",
  "3.7",
] as const;

export interface Connection {
  id: string;
  name: string;
  bootstrapServers: string;
  kafkaVersion: string;
  zookeeperEnabled: boolean;
  zookeeperHost: string | null;
  zookeeperPort: number | null;
  zookeeperChrootPath: string | null;
  securityProtocol: SecurityProtocol;
  saslMechanism: SaslMechanism | null;
  saslOauthUrl: string | null;
  schemaRegistryEndpoint: string | null;
  schemaRegistryTrustStoreLocation: string | null;
  schemaRegistryKeystoreLocation: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewConnection {
  name: string;
  bootstrapServers: string;
  kafkaVersion: string;
  zookeeperEnabled: boolean;
  zookeeperHost: string | null;
  zookeeperPort: number | null;
  zookeeperChrootPath: string | null;
  securityProtocol: SecurityProtocol;
  saslMechanism: SaslMechanism | null;
  saslOauthUrl: string | null;
  schemaRegistryEndpoint: string | null;
  schemaRegistryBasicAuthCredentials: string | null;
  schemaRegistryTrustStoreLocation: string | null;
  schemaRegistryTrustStorePassword: string | null;
  schemaRegistryKeystoreLocation: string | null;
  schemaRegistryKeystorePassword: string | null;
  schemaRegistryKeystoreKeyPassword: string | null;
}

export interface Tab {
  id: string;
  name: string;
  position: number;
}

export interface BrokerSummary {
  id: number;
  host: string;
  port: number;
}

export interface TopicSummary {
  name: string;
  partitionCount: number;
}

export interface ConsumerGroupSummary {
  groupId: string;
  state: string;
}

/** All fields optional — an all-undefined filter pulls every message. */
export interface MessageFilter {
  partitions: number[] | null;
  maxMessagesPerPartition: number | null;
  maxTotalMessages: number | null;
  fromTimestampMs: number | null;
  toTimestampMs: number | null;
}

export interface TopicMessage {
  partition: number;
  offset: number;
  timestampMs: number | null;
  key: string | null;
  payloadBase64: string;
}

export const api = {
  listConnections: () => invoke<Connection[]>("connection_list"),
  createConnection: (newConnection: NewConnection) =>
    invoke<Connection>("connection_create", { newConnection }),
  updateConnection: (id: string, newConnection: NewConnection) =>
    invoke<Connection>("connection_update", { id, newConnection }),
  deleteConnection: (id: string) => invoke<void>("connection_delete", { id }),
  checkConnectionStatus: (id: string) =>
    invoke<ConnectionStatus>("connection_check_status", { id }),
  pingBootstrapServers: (bootstrapServers: string) =>
    invoke<ConnectionStatus>("connection_ping_bootstrap", { bootstrapServers }),
  pingZookeeper: (host: string, port: number) =>
    invoke<ConnectionStatus>("connection_ping_zookeeper", { host, port }),
  testConnection: (newConnection: NewConnection) =>
    invoke<ConnectionStatus>("connection_test", { newConnection }),
  connectConnection: (id: string) => invoke<ConnectionStatus>("connection_connect", { id }),
  disconnectConnection: (id: string) => invoke<void>("connection_disconnect", { id }),
  isConnectionConnected: (id: string) => invoke<boolean>("connection_is_connected", { id }),
  listBrokers: (id: string) => invoke<BrokerSummary[]>("connection_list_brokers", { id }),
  listTopics: (id: string) => invoke<TopicSummary[]>("connection_list_topics", { id }),
  listConsumerGroups: (id: string) =>
    invoke<ConsumerGroupSummary[]>("connection_list_consumer_groups", { id }),
  countTopicMessages: (id: string, topic: string) =>
    invoke<number>("connection_count_topic_messages", { id, topic }),
  fetchMessages: (id: string, topic: string, filter: MessageFilter) =>
    invoke<TopicMessage[]>("connection_fetch_messages", { id, topic, filter }),
  listTabs: () => invoke<Tab[]>("tab_list"),
  createTab: (name: string) => invoke<Tab>("tab_create", { name }),
  renameTab: (id: string, name: string) => invoke<void>("tab_rename", { id, name }),
  deleteTab: (id: string) => invoke<void>("tab_delete", { id }),
};
