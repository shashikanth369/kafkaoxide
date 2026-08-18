import { KAFKA_VERSIONS, NewConnection, SaslMechanism, SecurityProtocol } from "../../../lib/tauri";

/**
 * Editable form state for the New Connection modal. Every field is a plain
 * string/boolean the inputs bind to directly; `toNewConnection` converts
 * this into the wire-format `NewConnection` on Test/Add.
 */
export interface ConnectionDraft {
  name: string;
  bootstrapServers: string;
  kafkaVersion: string;
  zookeeperEnabled: boolean;
  zookeeperHost: string;
  zookeeperPort: string;
  zookeeperChrootPath: string;
  securityProtocol: SecurityProtocol;
  saslMechanism: SaslMechanism | "";
  saslOauthUrl: string;
  schemaRegistryEndpoint: string;
  schemaRegistryBasicAuthCredentials: string;
  schemaRegistryTrustStoreLocation: string;
  schemaRegistryTrustStorePassword: string;
  schemaRegistryKeystoreLocation: string;
  schemaRegistryKeystorePassword: string;
  schemaRegistryKeystoreKeyPassword: string;
}

export function emptyDraft(): ConnectionDraft {
  return {
    name: "",
    bootstrapServers: "",
    kafkaVersion: KAFKA_VERSIONS[KAFKA_VERSIONS.length - 1],
    zookeeperEnabled: false,
    zookeeperHost: "",
    zookeeperPort: "",
    zookeeperChrootPath: "",
    securityProtocol: "PLAINTEXT",
    saslMechanism: "",
    saslOauthUrl: "",
    schemaRegistryEndpoint: "",
    schemaRegistryBasicAuthCredentials: "",
    schemaRegistryTrustStoreLocation: "",
    schemaRegistryTrustStorePassword: "",
    schemaRegistryKeystoreLocation: "",
    schemaRegistryKeystorePassword: "",
    schemaRegistryKeystoreKeyPassword: "",
  };
}

export function validateDraft(draft: ConnectionDraft): string | null {
  if (draft.name.trim().length === 0) return "Cluster name is required";
  if (draft.bootstrapServers.trim().length === 0) return "Bootstrap servers is required";
  if (draft.zookeeperEnabled) {
    if (draft.zookeeperHost.trim().length === 0) {
      return "Zookeeper host is required when Zookeeper is enabled";
    }
    if (draft.zookeeperPort.trim().length === 0) {
      return "Zookeeper port is required when Zookeeper is enabled";
    }
  }
  return null;
}

function nullableTrim(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function toNewConnection(draft: ConnectionDraft): NewConnection {
  const zookeeperHost = draft.zookeeperEnabled ? nullableTrim(draft.zookeeperHost) : null;
  const zookeeperPort =
    draft.zookeeperEnabled && draft.zookeeperPort.trim().length > 0
      ? Number(draft.zookeeperPort)
      : null;
  const zookeeperChrootPath = draft.zookeeperEnabled ? nullableTrim(draft.zookeeperChrootPath) : null;

  return {
    name: draft.name.trim(),
    bootstrapServers: draft.bootstrapServers.trim(),
    kafkaVersion: draft.kafkaVersion,
    zookeeperEnabled: draft.zookeeperEnabled,
    zookeeperHost,
    zookeeperPort,
    zookeeperChrootPath,
    securityProtocol: draft.securityProtocol,
    saslMechanism: draft.saslMechanism === "" ? null : draft.saslMechanism,
    saslOauthUrl: nullableTrim(draft.saslOauthUrl),
    schemaRegistryEndpoint: nullableTrim(draft.schemaRegistryEndpoint),
    schemaRegistryBasicAuthCredentials: nullableTrim(draft.schemaRegistryBasicAuthCredentials),
    schemaRegistryTrustStoreLocation: nullableTrim(draft.schemaRegistryTrustStoreLocation),
    schemaRegistryTrustStorePassword: nullableTrim(draft.schemaRegistryTrustStorePassword),
    schemaRegistryKeystoreLocation: nullableTrim(draft.schemaRegistryKeystoreLocation),
    schemaRegistryKeystorePassword: nullableTrim(draft.schemaRegistryKeystorePassword),
    schemaRegistryKeystoreKeyPassword: nullableTrim(draft.schemaRegistryKeystoreKeyPassword),
  };
}
