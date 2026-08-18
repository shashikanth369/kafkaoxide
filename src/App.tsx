import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ThemeProvider } from "./features/theme/ThemeProvider";
import { ThemeSwitcher } from "./features/theme/ThemeSwitcher";
import { TabBar } from "./features/tabs/TabBar";
import { useTabsStore } from "./features/tabs/useTabsStore";
import { ConnectionTree } from "./features/connections/ConnectionTree";
import { ConnectionForm } from "./features/connections/ConnectionForm";
import { useCreateConnection } from "./features/connections/useConnections";
import { BottomPanel } from "./features/bottom-panel/BottomPanel";
import "./styles/themes.css";
import "./styles/global.css";

const queryClient = new QueryClient();

function AppShell() {
  const [showForm, setShowForm] = useState(false);
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
          <button type="button" onClick={() => setShowForm(true)}>
            + Add connection
          </button>
          {showForm && (
            <ConnectionForm
              submitLabel="Add connection"
              onSubmit={async (connection) => {
                await createConnection.mutateAsync(connection);
                setShowForm(false);
              }}
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
