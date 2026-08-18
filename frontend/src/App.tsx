import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ThemeProvider } from "./features/theme/ThemeProvider";
import { ThemeSwitcher } from "./features/theme/ThemeSwitcher";
import { TabBar } from "./features/tabs/TabBar";
import { useTabsStore } from "./features/tabs/useTabsStore";
import { ConnectionTree } from "./features/connections/ConnectionTree";
import { ConnectionModal } from "./features/connections/modal/ConnectionModal";
import { useCreateConnection } from "./features/connections/useConnections";
import { BottomPanel } from "./features/bottom-panel/BottomPanel";
import "./styles/themes.css";
import "./styles/global.css";

const queryClient = new QueryClient();

function AppShell() {
  const [showModal, setShowModal] = useState(false);
  const createConnection = useCreateConnection();
  const loadTabs = useTabsStore((s) => s.loadTabs);

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
        <main className="app-main">
          <p className="app-main-placeholder">Select a topic to browse messages.</p>
        </main>
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
