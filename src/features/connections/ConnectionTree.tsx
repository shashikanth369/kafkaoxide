import { ConnectionStatus } from "../../lib/tauri";
import { useConnectionsQuery, useConnectionStatus } from "./useConnections";

function statusClass(status: ConnectionStatus): string {
  if (status === "REACHABLE") return "status-dot status-dot--green";
  if (status === "UNREACHABLE") return "status-dot status-dot--red";
  return "status-dot status-dot--gray";
}

function ConnectionRow({ id, name }: { id: string; name: string }) {
  const { data: status } = useConnectionStatus(id);
  return (
    <div className="connection-row" role="treeitem" aria-label={name}>
      <span className={statusClass(status ?? "UNKNOWN")} data-testid={`status-${id}`} />
      <span>{name}</span>
    </div>
  );
}

export function ConnectionTree() {
  const { data: connections, isLoading } = useConnectionsQuery();

  if (isLoading) {
    return <p>Loading connections…</p>;
  }

  if (!connections || connections.length === 0) {
    return <p>No connections yet. Add one to get started.</p>;
  }

  return (
    <div role="tree" aria-label="Connections">
      {connections.map((connection) => (
        <ConnectionRow key={connection.id} id={connection.id} name={connection.name} />
      ))}
    </div>
  );
}
