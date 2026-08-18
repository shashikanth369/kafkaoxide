import { describe, expect, it } from "vitest";
import { emptyDraft, toNewConnection, validateDraft } from "./draft";

describe("emptyDraft", () => {
  it("defaults to plaintext with zookeeper disabled and no sasl mechanism", () => {
    const draft = emptyDraft();
    expect(draft.securityProtocol).toBe("PLAINTEXT");
    expect(draft.zookeeperEnabled).toBe(false);
    expect(draft.saslMechanism).toBe("");
  });

  it("defaults the kafka version to the newest supported version", () => {
    expect(emptyDraft().kafkaVersion).toBe("3.7");
  });
});

describe("validateDraft", () => {
  it("requires a cluster name", () => {
    const draft = emptyDraft();
    draft.bootstrapServers = "localhost:9092";
    expect(validateDraft(draft)).toBe("Cluster name is required");
  });

  it("requires bootstrap servers", () => {
    const draft = emptyDraft();
    draft.name = "Local";
    expect(validateDraft(draft)).toBe("Bootstrap servers is required");
  });

  it("requires a zookeeper host when zookeeper is enabled", () => {
    const draft = emptyDraft();
    draft.name = "Local";
    draft.bootstrapServers = "localhost:9092";
    draft.zookeeperEnabled = true;
    draft.zookeeperPort = "2181";
    expect(validateDraft(draft)).toBe("Zookeeper host is required when Zookeeper is enabled");
  });

  it("requires a zookeeper port when zookeeper is enabled", () => {
    const draft = emptyDraft();
    draft.name = "Local";
    draft.bootstrapServers = "localhost:9092";
    draft.zookeeperEnabled = true;
    draft.zookeeperHost = "zk.local";
    expect(validateDraft(draft)).toBe("Zookeeper port is required when Zookeeper is enabled");
  });

  it("passes for a minimal valid draft", () => {
    const draft = emptyDraft();
    draft.name = "Local";
    draft.bootstrapServers = "localhost:9092";
    expect(validateDraft(draft)).toBeNull();
  });

  it("does not require zookeeper fields when zookeeper is disabled", () => {
    const draft = emptyDraft();
    draft.name = "Local";
    draft.bootstrapServers = "localhost:9092";
    draft.zookeeperEnabled = false;
    expect(validateDraft(draft)).toBeNull();
  });
});

describe("toNewConnection", () => {
  it("trims and nulls out blank optional fields", () => {
    const draft = emptyDraft();
    draft.name = "  Local  ";
    draft.bootstrapServers = "  localhost:9092  ";

    const result = toNewConnection(draft);

    expect(result.name).toBe("Local");
    expect(result.bootstrapServers).toBe("localhost:9092");
    expect(result.zookeeperHost).toBeNull();
    expect(result.zookeeperPort).toBeNull();
    expect(result.zookeeperChrootPath).toBeNull();
    expect(result.saslMechanism).toBeNull();
    expect(result.saslOauthUrl).toBeNull();
    expect(result.schemaRegistryEndpoint).toBeNull();
    expect(result.schemaRegistryBasicAuthCredentials).toBeNull();
  });

  it("carries zookeeper fields through when enabled, parsing the port as a number", () => {
    const draft = emptyDraft();
    draft.name = "Local";
    draft.bootstrapServers = "localhost:9092";
    draft.zookeeperEnabled = true;
    draft.zookeeperHost = "zk.local";
    draft.zookeeperPort = "2181";
    draft.zookeeperChrootPath = "/kafka";

    const result = toNewConnection(draft);

    expect(result.zookeeperEnabled).toBe(true);
    expect(result.zookeeperHost).toBe("zk.local");
    expect(result.zookeeperPort).toBe(2181);
    expect(result.zookeeperChrootPath).toBe("/kafka");
  });

  it("omits zookeeper host/port/chroot even if filled in when zookeeper is disabled", () => {
    const draft = emptyDraft();
    draft.name = "Local";
    draft.bootstrapServers = "localhost:9092";
    draft.zookeeperEnabled = false;
    draft.zookeeperHost = "zk.local";
    draft.zookeeperPort = "2181";

    const result = toNewConnection(draft);

    expect(result.zookeeperHost).toBeNull();
    expect(result.zookeeperPort).toBeNull();
  });

  it("converts an empty sasl mechanism selection to null", () => {
    const draft = emptyDraft();
    draft.name = "Local";
    draft.bootstrapServers = "localhost:9092";
    draft.saslMechanism = "SCRAM-SHA-512";

    expect(toNewConnection(draft).saslMechanism).toBe("SCRAM-SHA-512");
  });

  it("carries all schema registry fields through, trimmed", () => {
    const draft = emptyDraft();
    draft.name = "Local";
    draft.bootstrapServers = "localhost:9092";
    draft.schemaRegistryEndpoint = " https://schema-registry.local ";
    draft.schemaRegistryBasicAuthCredentials = "user:pass";
    draft.schemaRegistryTrustStoreLocation = "/etc/ts.jks";
    draft.schemaRegistryTrustStorePassword = "ts-secret";
    draft.schemaRegistryKeystoreLocation = "/etc/ks.jks";
    draft.schemaRegistryKeystorePassword = "ks-secret";
    draft.schemaRegistryKeystoreKeyPassword = "ks-key-secret";

    const result = toNewConnection(draft);

    expect(result.schemaRegistryEndpoint).toBe("https://schema-registry.local");
    expect(result.schemaRegistryBasicAuthCredentials).toBe("user:pass");
    expect(result.schemaRegistryTrustStoreLocation).toBe("/etc/ts.jks");
    expect(result.schemaRegistryTrustStorePassword).toBe("ts-secret");
    expect(result.schemaRegistryKeystoreLocation).toBe("/etc/ks.jks");
    expect(result.schemaRegistryKeystorePassword).toBe("ks-secret");
    expect(result.schemaRegistryKeystoreKeyPassword).toBe("ks-key-secret");
  });
});
