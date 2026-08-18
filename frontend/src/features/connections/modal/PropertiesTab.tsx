import { KAFKA_VERSIONS } from "../../../lib/tauri";
import { usePingBootstrapServers, usePingZookeeper } from "../useConnections";
import { ConnectionDraft } from "./draft";
import { PingResult } from "./PingResult";

export interface ConnectionTabProps {
  draft: ConnectionDraft;
  onChange: (patch: Partial<ConnectionDraft>) => void;
}

export function PropertiesTab({ draft, onChange }: ConnectionTabProps) {
  const pingBootstrap = usePingBootstrapServers();
  const pingZookeeper = usePingZookeeper();

  return (
    <div role="tabpanel" aria-label="Properties" className="connection-modal-tab-panel">
      <section className="connection-modal-section">
        <h3>General</h3>
        <label>
          Cluster name
          <input value={draft.name} onChange={(e) => onChange({ name: e.target.value })} />
        </label>
        <label>
          Bootstrap servers
          <div className="connection-modal-input-row">
            <input
              value={draft.bootstrapServers}
              onChange={(e) => onChange({ bootstrapServers: e.target.value })}
              placeholder="localhost:9092"
            />
            <button
              type="button"
              aria-label="Ping bootstrap servers"
              disabled={pingBootstrap.isPending || draft.bootstrapServers.trim().length === 0}
              onClick={() => pingBootstrap.mutate(draft.bootstrapServers.trim())}
            >
              Ping
            </button>
          </div>
        </label>
        <PingResult mutation={pingBootstrap} failureMessage="Unable to reach bootstrap servers" />
        <label>
          Kafka cluster version
          <select value={draft.kafkaVersion} onChange={(e) => onChange({ kafkaVersion: e.target.value })}>
            {KAFKA_VERSIONS.map((version) => (
              <option key={version} value={version}>
                {version}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="connection-modal-section">
        <h3>Zookeeper</h3>
        <label className="connection-modal-checkbox-label">
          <input
            type="checkbox"
            checked={draft.zookeeperEnabled}
            onChange={(e) => onChange({ zookeeperEnabled: e.target.checked })}
          />
          Enable Zookeeper
        </label>
        {draft.zookeeperEnabled && (
          <>
            <label>
              Zookeeper host
              <div className="connection-modal-input-row">
                <input
                  value={draft.zookeeperHost}
                  onChange={(e) => onChange({ zookeeperHost: e.target.value })}
                />
                <button
                  type="button"
                  aria-label="Ping zookeeper"
                  disabled={
                    pingZookeeper.isPending ||
                    draft.zookeeperHost.trim().length === 0 ||
                    draft.zookeeperPort.trim().length === 0
                  }
                  onClick={() =>
                    pingZookeeper.mutate({
                      host: draft.zookeeperHost.trim(),
                      port: Number(draft.zookeeperPort),
                    })
                  }
                >
                  Ping
                </button>
              </div>
            </label>
            <PingResult mutation={pingZookeeper} failureMessage="Unable to reach zookeeper" />
            <label>
              Zookeeper port
              <input
                inputMode="numeric"
                value={draft.zookeeperPort}
                onChange={(e) => onChange({ zookeeperPort: e.target.value })}
              />
            </label>
            <label>
              Zookeeper chroot path
              <input
                value={draft.zookeeperChrootPath}
                onChange={(e) => onChange({ zookeeperChrootPath: e.target.value })}
                placeholder="/kafka"
              />
            </label>
          </>
        )}
      </section>
    </div>
  );
}
