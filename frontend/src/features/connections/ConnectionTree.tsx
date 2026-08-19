import { useState } from "react";
import { useIsMutating } from "@tanstack/react-query";
import { ConnectionStatus } from "../../lib/tauri";
import { connectMutationKey, useConnectionConnected, useConnectionsQuery, useConnectionStatus } from "./useConnections";
import { useWorkspaceSelectionStore } from "../workspace/useWorkspaceSelectionStore";
import { ClusterResourceTree } from "./ClusterResourceTree";

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
  const [expanded, setExpanded] = useState(false);
  const connected = isConnected ?? false;
  const isConnecting = useIsMutating({ mutationKey: connectMutationKey(id) }) > 0;

  return (
    <>
      <li
        className={`connection-row${isSelected ? " connection-row--selected" : ""}`}
        data-testid={`connection-row-${id}`}
        onClick={() => selectConnection(id, name)}
      >
        {connected && (
          <button
            type="button"
            className={`tree-caret-button${expanded ? " tree-caret-button--expanded" : ""}`}
            aria-label={`${expanded ? "Collapse" : "Expand"} ${name}`}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((current) => !current);
            }}
          >
            <span className="tree-caret" aria-hidden="true" />
          </button>
        )}
        <span className={statusClass(status ?? "UNKNOWN", connected)} data-testid={`status-${id}`} />
        <span>{name}</span>
        {isConnecting && <span className="spinner" role="status" aria-label="Connecting" />}
      </li>
      {connected && (
        <li className="connection-row-children" style={expanded ? undefined : { display: "none" }}>
          <ClusterResourceTree connectionId={id} />
        </li>
      )}
    </>
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
