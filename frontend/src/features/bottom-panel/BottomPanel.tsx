import { useState } from "react";
import { LogsPanel } from "./LogsPanel";
import { useLogsListener } from "./useLogsListener";

const TOOLS = [{ id: "logs", label: "Logs" }] as const;

export function BottomPanel() {
  useLogsListener();
  const [activeTool, setActiveTool] = useState<string>("logs");

  return (
    <div className="bottom-panel">
      <div className="bottom-panel-tabs" role="tablist">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            type="button"
            role="tab"
            aria-selected={activeTool === tool.id}
            onClick={() => setActiveTool(tool.id)}
          >
            {tool.label}
          </button>
        ))}
      </div>
      <div className="bottom-panel-content">{activeTool === "logs" && <LogsPanel />}</div>
    </div>
  );
}
