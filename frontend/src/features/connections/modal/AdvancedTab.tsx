import { SaslMechanism } from "../../../lib/tauri";
import { ConnectionTabProps } from "./PropertiesTab";

const SASL_MECHANISMS: SaslMechanism[] = ["PLAIN", "SCRAM-SHA-256", "SCRAM-SHA-512"];

export function AdvancedTab({ draft, onChange, disabled = false }: ConnectionTabProps) {
  return (
    <div role="tabpanel" aria-label="Advanced" className="connection-modal-tab-panel">
      <fieldset disabled={disabled} className="connection-modal-fieldset">
        <section className="connection-modal-section">
          <h3>Advanced</h3>
          <label>
            SASL mechanism
            <select
              value={draft.saslMechanism}
              onChange={(e) => onChange({ saslMechanism: e.target.value as SaslMechanism | "" })}
            >
              <option value="">None</option>
              {SASL_MECHANISMS.map((mechanism) => (
                <option key={mechanism} value={mechanism}>
                  {mechanism}
                </option>
              ))}
            </select>
          </label>
          <label>
            SASL OAuth/OIDC identity provider URL
            <input
              value={draft.saslOauthUrl}
              onChange={(e) => onChange({ saslOauthUrl: e.target.value })}
              placeholder="https://idp.example.com/token"
            />
          </label>
        </section>

        <section className="connection-modal-section">
          <h3>Schema Registry</h3>
          <label>
            Endpoint
            <input
              value={draft.schemaRegistryEndpoint}
              onChange={(e) => onChange({ schemaRegistryEndpoint: e.target.value })}
              placeholder="https://schema-registry.example.com"
            />
          </label>
          <label>
            Basic auth credentials
            <input
              type="password"
              value={draft.schemaRegistryBasicAuthCredentials}
              onChange={(e) => onChange({ schemaRegistryBasicAuthCredentials: e.target.value })}
            />
          </label>
          <label>
            Trust store location
            <input
              value={draft.schemaRegistryTrustStoreLocation}
              onChange={(e) => onChange({ schemaRegistryTrustStoreLocation: e.target.value })}
            />
          </label>
          <label>
            Trust store password
            <input
              type="password"
              value={draft.schemaRegistryTrustStorePassword}
              onChange={(e) => onChange({ schemaRegistryTrustStorePassword: e.target.value })}
            />
          </label>
          <label>
            Keystore location
            <input
              value={draft.schemaRegistryKeystoreLocation}
              onChange={(e) => onChange({ schemaRegistryKeystoreLocation: e.target.value })}
            />
          </label>
          <label>
            Keystore password
            <input
              type="password"
              value={draft.schemaRegistryKeystorePassword}
              onChange={(e) => onChange({ schemaRegistryKeystorePassword: e.target.value })}
            />
          </label>
          <label>
            Keystore private key password
            <input
              type="password"
              value={draft.schemaRegistryKeystoreKeyPassword}
              onChange={(e) => onChange({ schemaRegistryKeystoreKeyPassword: e.target.value })}
            />
          </label>
        </section>
      </fieldset>
    </div>
  );
}
