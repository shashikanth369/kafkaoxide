import { JsonTreeView } from "../../components/JsonTreeView";
import { useTabsStore } from "./useTabsStore";
import { JsonViewerTab, useJsonViewerTabsStore } from "./useJsonViewerTabsStore";

export interface JsonViewerTabPanelProps {
  tab: JsonViewerTab;
}

/** The middle pane's content for an ephemeral "opened in new tab" JSON view — takes over the whole pane instead of sharing it with the usual cluster/topic detail panel. */
export function JsonViewerTabPanel({ tab }: JsonViewerTabPanelProps) {
  const openTab = useJsonViewerTabsStore((s) => s.openTab);
  const selectTab = useTabsStore((s) => s.selectTab);

  return (
    <div className="cluster-detail-panel">
      <header className="cluster-detail-header">
        <h2>{tab.title}</h2>
      </header>
      <div className="connection-modal-body">
        <JsonTreeView value={tab.value} onOpenInNewTab={() => selectTab(openTab(tab.title, tab.value))} />
      </div>
    </div>
  );
}
