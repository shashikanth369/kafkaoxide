import { LogsPanel } from "./LogsPanel";
import { useLogsListener } from "./useLogsListener";
import { useLogsStore } from "./useLogsStore";
import { useWorkspaceSelectionStore, WorkspaceSelection } from "../workspace/useWorkspaceSelectionStore";
import { useMessageViewerStore } from "../workspace/useMessageViewerStore";

/** A short label for what the active tab currently has cached — shown next to "Clear memory" in the status strip. */
export function describeTabMemory(selection: WorkspaceSelection): string {
  if (!selection) return "Empty";
  switch (selection.type) {
    case "connection":
      return `Cluster ${selection.name}`;
    case "broker":
      return `Broker ${selection.brokerId}`;
    case "topic":
      return `Topic ${selection.topicName}`;
    case "consumerGroup":
      return `Consumer group ${selection.groupId}`;
  }
}

export function BottomPanel() {
  useLogsListener();
  const isExpanded = useLogsStore((s) => s.isExpanded);
  const toggleExpanded = useLogsStore((s) => s.toggleExpanded);
  const selection = useWorkspaceSelectionStore((s) => s.selection);
  const clearSelectionMemory = useWorkspaceSelectionStore((s) => s.clearTabMemory);
  const clearMessageMemory = useMessageViewerStore((s) => s.clearTabMemory);

  function handleClearMemory() {
    clearSelectionMemory();
    clearMessageMemory();
  }

  return (
    <div className="bottom-panel">
      <div className="bottom-panel-status-strip">
        <button
          type="button"
          aria-label="Toggle logs panel"
          aria-expanded={isExpanded}
          className="bottom-panel-toggle"
          onClick={toggleExpanded}
        >
          {isExpanded ? "▾" : "▸"} Logs
        </button>
        <div className="bottom-panel-memory">
          <span className="bottom-panel-memory-label">Tab memory: {describeTabMemory(selection)}</span>
          <button type="button" aria-label="Clear tab memory" onClick={handleClearMemory}>
            Clear memory
          </button>
        </div>
      </div>
      {isExpanded && <div className="bottom-panel-content">{<LogsPanel />}</div>}
    </div>
  );
}
