import { FormEvent, useState } from "react";
import { NewConnection, SaslMechanism, SecurityProtocol } from "../../lib/tauri";

const SECURITY_PROTOCOLS: SecurityProtocol[] = ["PLAINTEXT", "SSL", "SASL_PLAINTEXT", "SASL_SSL"];
const SASL_MECHANISMS: SaslMechanism[] = ["PLAIN", "SCRAM-SHA-256", "SCRAM-SHA-512"];

export interface ConnectionFormProps {
  initial?: NewConnection;
  onSubmit: (connection: NewConnection) => void | Promise<void>;
  submitLabel: string;
}

export function ConnectionForm({ initial, onSubmit, submitLabel }: ConnectionFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [bootstrapServers, setBootstrapServers] = useState(initial?.bootstrapServers ?? "");
  const [securityProtocol, setSecurityProtocol] = useState<SecurityProtocol>(
    initial?.securityProtocol ?? "PLAINTEXT",
  );
  const [saslMechanism, setSaslMechanism] = useState<SaslMechanism | "">(initial?.saslMechanism ?? "");
  const [saslUsername, setSaslUsername] = useState(initial?.saslUsername ?? "");
  const [saslPassword, setSaslPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const requiresSasl = securityProtocol === "SASL_PLAINTEXT" || securityProtocol === "SASL_SSL";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (name.trim().length === 0) {
      setError("Name is required");
      return;
    }
    if (bootstrapServers.trim().length === 0) {
      setError("Bootstrap servers is required");
      return;
    }
    if (requiresSasl && saslMechanism === "") {
      setError("SASL mechanism is required for this security protocol");
      return;
    }

    await onSubmit({
      name: name.trim(),
      bootstrapServers: bootstrapServers.trim(),
      securityProtocol,
      saslMechanism: requiresSasl && saslMechanism !== "" ? saslMechanism : null,
      saslUsername: requiresSasl && saslUsername.trim().length > 0 ? saslUsername.trim() : null,
      saslPassword: requiresSasl && saslPassword.length > 0 ? saslPassword : null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="connection-form">
      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        Bootstrap servers
        <input
          value={bootstrapServers}
          onChange={(e) => setBootstrapServers(e.target.value)}
          placeholder="localhost:9092"
        />
      </label>
      <label>
        Security protocol
        <select
          value={securityProtocol}
          onChange={(e) => setSecurityProtocol(e.target.value as SecurityProtocol)}
        >
          {SECURITY_PROTOCOLS.map((protocol) => (
            <option key={protocol} value={protocol}>
              {protocol}
            </option>
          ))}
        </select>
      </label>
      {requiresSasl && (
        <>
          <label>
            SASL mechanism
            <select
              value={saslMechanism}
              onChange={(e) => setSaslMechanism(e.target.value as SaslMechanism)}
            >
              <option value="">Select…</option>
              {SASL_MECHANISMS.map((mechanism) => (
                <option key={mechanism} value={mechanism}>
                  {mechanism}
                </option>
              ))}
            </select>
          </label>
          <label>
            Username
            <input value={saslUsername} onChange={(e) => setSaslUsername(e.target.value)} />
          </label>
          <label>
            Password
            <input
              type="password"
              value={saslPassword}
              onChange={(e) => setSaslPassword(e.target.value)}
            />
          </label>
        </>
      )}
      {error && <p role="alert">{error}</p>}
      <button type="submit">{submitLabel}</button>
    </form>
  );
}
