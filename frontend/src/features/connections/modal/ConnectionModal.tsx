import { useState } from "react";
import { NewConnection } from "../../../lib/tauri";
import { useTestConnection } from "../useConnections";
import { AdvancedTab } from "./AdvancedTab";
import { ConnectionDraft, emptyDraft, toNewConnection, validateDraft } from "./draft";
import { PingResult } from "./PingResult";
import { PropertiesTab } from "./PropertiesTab";
import { SecurityTab } from "./SecurityTab";

type ModalTabId = "properties" | "security" | "advanced";

const MODAL_TABS: { id: ModalTabId; label: string }[] = [
  { id: "properties", label: "Properties" },
  { id: "security", label: "Security" },
  { id: "advanced", label: "Advanced" },
];

export interface ConnectionModalProps {
  onAdd: (connection: NewConnection) => void | Promise<void>;
  onCancel: () => void;
}

export function ConnectionModal({ onAdd, onCancel }: ConnectionModalProps) {
  const [activeTab, setActiveTab] = useState<ModalTabId>("properties");
  const [draft, setDraft] = useState<ConnectionDraft>(emptyDraft);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const testConnection = useTestConnection();

  function updateDraft(patch: Partial<ConnectionDraft>) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  function validateOrShowError(): boolean {
    const error = validateDraft(draft);
    setValidationError(error);
    return error === null;
  }

  async function handleTest() {
    if (!validateOrShowError()) return;
    testConnection.mutate(toNewConnection(draft));
  }

  async function handleAdd() {
    if (!validateOrShowError()) return;
    setIsAdding(true);
    try {
      await onAdd(toNewConnection(draft));
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : "Failed to add connection");
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <div className="connection-modal-overlay" onClick={onCancel}>
      <div
        className="connection-modal"
        role="dialog"
        aria-modal="true"
        aria-label="New Connection"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="connection-modal-header">
          <h2>New Connection</h2>
        </header>

        <div className="connection-modal-tabs" role="tablist">
          {MODAL_TABS.map((tab) => (
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
          {activeTab === "properties" && <PropertiesTab draft={draft} onChange={updateDraft} />}
          {activeTab === "security" && <SecurityTab draft={draft} onChange={updateDraft} />}
          {activeTab === "advanced" && <AdvancedTab draft={draft} onChange={updateDraft} />}
        </div>

        {validationError && (
          <p role="alert" className="connection-modal-error">
            {validationError}
          </p>
        )}
        <PingResult
          mutation={testConnection}
          successMessage="Connection succeeded"
          failureMessage="Connection failed: unable to reach the cluster"
        />

        <footer className="connection-modal-footer">
          <button type="button" onClick={handleTest} disabled={testConnection.isPending}>
            Test
          </button>
          <button type="button" onClick={handleAdd} disabled={isAdding}>
            Add
          </button>
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        </footer>
      </div>
    </div>
  );
}
