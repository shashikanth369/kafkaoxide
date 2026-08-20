import { JsonTreeView } from "../../components/JsonTreeView";
import { JsonViewerTab } from "./useJsonViewerTabsStore";

export interface JsonViewerTabPanelProps {
  tab: JsonViewerTab;
}

/**
 * The middle pane's content for an ephemeral "opened in new tab" JSON view —
 * takes over the whole pane instead of sharing it with the usual
 * cluster/topic detail panel. No "open in new tab" button here: this view
 * already *is* a dedicated tab for the value, so there's nothing new to open.
 */
export function JsonViewerTabPanel({ tab }: JsonViewerTabPanelProps) {
  return (
    <div className="cluster-detail-panel">
      <header className="cluster-detail-header">
        <h2>{tab.title}</h2>
      </header>
      <div className="connection-modal-body">
        <JsonTreeView value={tab.value} />
      </div>
    </div>
  );
}
