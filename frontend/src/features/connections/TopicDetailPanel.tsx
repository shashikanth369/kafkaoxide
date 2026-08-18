import { useState } from "react";
import { TopicPropertiesTab } from "./TopicPropertiesTab";

export interface TopicDetailPanelProps {
  connectionId: string;
  topicName: string;
}

type TopicTabId = "properties" | "data" | "partitions" | "config";

const TOPIC_TABS: { id: TopicTabId; label: string }[] = [
  { id: "properties", label: "Properties" },
  { id: "data", label: "Data" },
  { id: "partitions", label: "Partitions" },
  { id: "config", label: "Config" },
];

export function TopicDetailPanel({ connectionId, topicName }: TopicDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<TopicTabId>("properties");

  return (
    <div className="cluster-detail-panel">
      <header className="cluster-detail-header">
        <h2>{topicName}</h2>
      </header>

      <div className="connection-modal-tabs" role="tablist">
        {TOPIC_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`connection-modal-tab${activeTab === tab.id ? " connection-modal-tab--active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="connection-modal-body">
        {activeTab === "properties" && (
          <TopicPropertiesTab connectionId={connectionId} topicName={topicName} />
        )}
        {activeTab === "data" && <p className="app-main-placeholder">Message browser coming soon.</p>}
        {activeTab === "partitions" && <p className="app-main-placeholder">Partition list coming soon.</p>}
        {activeTab === "config" && <p className="app-main-placeholder">Topic config coming soon.</p>}
      </div>
    </div>
  );
}
