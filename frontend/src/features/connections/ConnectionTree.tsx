import { ConnectionStatus } from "../../lib/tauri";
import { useConnectionConnected, useConnectionsQuery, useConnectionStatus } from "./useConnections";
import { useWorkspaceSelectionStore } from "../workspace/useWorkspaceSelectionStore";

/**
 * Green requires both a reachable ping AND an explicit "connected" session
 * (see Reconnect/Disconnect) — a cluster that's merely network-reachable
 * but never connected shows gray, matching the cluster detail panel's
 * connect-state-gated field disabling and the tree's Brokers/Topics/
 * Consumers expansion, which key off the same "connected" flag.
 */
function statusClass(status: ConnectionStatus, isConnected: boolean): string {
  if (status === "UNREACHABLE") return "status-dot status-dot--red";
  if (status === "REACHABLE" && isConnected) return "status-dot status-dot--green";
  return "status-dot status-dot--gray";
}

function ConnectionRow({ id, name }: { id: string; name: string }) {
  const { data: status } = useConnectionStatus(id);
  const { data: isConnected } = useConnectionConnected(id);
  const selection = useWorkspaceSelectionStore((s) => s.selection);
  const selectConnection = useWorkspaceSelectionStore((s) => s.selectConnection);
  const isSelected = selection?.type === "connection" && selection.id === id;

  return (
    <li
      className={`connection-row${isSelected ? " connection-row--selected" : ""}`}
      data-testid={`connection-row-${id}`}
      onClick={() => selectConnection(id)}
    >
      <span className={statusClass(status ?? "UNKNOWN", isConnected ?? false)} data-testid={`status-${id}`} />
      <span>{name}</span>
    </li>
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
    <ul className="connection-tree" data-testid="connection-tree" aria-label="Connections">
      {connections.map((connection) => (
        <ConnectionRow key={connection.id} id={connection.id} name={connection.name} />
      ))}
    </ul>
  );
}
