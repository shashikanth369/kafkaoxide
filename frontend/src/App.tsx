import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ThemeProvider } from "./features/theme/ThemeProvider";
import { ThemeSwitcher } from "./features/theme/ThemeSwitcher";
import { TabBar } from "./features/tabs/TabBar";
import { useTabsStore } from "./features/tabs/useTabsStore";
import { ConnectionTree } from "./features/connections/ConnectionTree";
import { ConnectionModal } from "./features/connections/modal/ConnectionModal";
import { ClusterDetailPanel } from "./features/connections/ClusterDetailPanel";
import { BrokerDetailPanel } from "./features/connections/BrokerDetailPanel";
import { TopicDetailPanel } from "./features/connections/TopicDetailPanel";
import { MessagePayloadViewer } from "./features/connections/MessagePayloadViewer";
import { ConsumerGroupDetailPanel } from "./features/connections/ConsumerGroupDetailPanel";
import { useCreateConnection } from "./features/connections/useConnections";
import { BottomPanel } from "./features/bottom-panel/BottomPanel";
import { ResizableShell } from "./features/layout/ResizableShell";
import { useWorkspaceSelectionStore } from "./features/workspace/useWorkspaceSelectionStore";
import "./styles/themes.css";
import "./styles/global.css";

const queryClient = new QueryClient();

function AppShell() {
  const [showModal, setShowModal] = useState(false);
  const createConnection = useCreateConnection();
  const loadTabs = useTabsStore((s) => s.loadTabs);
  const selection = useWorkspaceSelectionStore((s) => s.selection);

  useEffect(() => {
    loadTabs();
  }, [loadTabs]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <TabBar />
        <ThemeSwitcher />
      </header>
      <div className="app-body">
        <ResizableShell
          left={
            <aside className="app-sidebar">
              <button type="button" onClick={() => setShowModal(true)}>
                + New Connection
              </button>
              {showModal && (
                <ConnectionModal
                  onAdd={async (connection) => {
                    await createConnection.mutateAsync(connection);
                    setShowModal(false);
                  }}
                  onCancel={() => setShowModal(false)}
                />
              )}
              <ConnectionTree />
            </aside>
          }
          middle={
            <main className="app-main">
              {selection?.type === "connection" && <ClusterDetailPanel connectionId={selection.id} />}
              {selection?.type === "broker" && (
                <BrokerDetailPanel connectionId={selection.connectionId} brokerId={selection.brokerId} />
              )}
              {selection?.type === "topic" && (
                <TopicDetailPanel connectionId={selection.connectionId} topicName={selection.topicName} />
              )}
              {selection?.type === "consumerGroup" && (
                <ConsumerGroupDetailPanel connectionId={selection.connectionId} groupId={selection.groupId} />
              )}
              {!selection && <p className="app-main-placeholder">Select a cluster, broker, or topic.</p>}
            </main>
          }
          right={<MessagePayloadViewer />}
        />
      </div>
      <BottomPanel />
    </div>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppShell />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
