import { SecurityProtocol } from "../../../lib/tauri";
import { ConnectionTabProps } from "./PropertiesTab";

const SECURITY_PROTOCOLS: SecurityProtocol[] = ["PLAINTEXT", "SSL", "SASL_PLAINTEXT", "SASL_SSL"];

export function SecurityTab({ draft, onChange }: ConnectionTabProps) {
  return (
    <div role="tabpanel" aria-label="Security" className="connection-modal-tab-panel">
      <section className="connection-modal-section">
        <h3>Broker security</h3>
        <label>
          Type
          <select
            value={draft.securityProtocol}
            onChange={(e) => onChange({ securityProtocol: e.target.value as SecurityProtocol })}
          >
            {SECURITY_PROTOCOLS.map((protocol) => (
              <option key={protocol} value={protocol}>
                {protocol}
              </option>
            ))}
          </select>
        </label>
      </section>
    </div>
  );
}
