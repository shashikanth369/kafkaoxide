import { KeyboardEvent, useState } from "react";
import { useTabsStore } from "./useTabsStore";

export function TabBar() {
  const tabs = useTabsStore((s) => s.tabs);
  const activeTabId = useTabsStore((s) => s.activeTabId);
  const error = useTabsStore((s) => s.error);
  const selectTab = useTabsStore((s) => s.selectTab);
  const renameTab = useTabsStore((s) => s.renameTab);
  const addTab = useTabsStore((s) => s.addTab);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  function startEditing(id: string, currentName: string) {
    setEditingId(id);
    setDraftName(currentName);
  }

  function commitEditing() {
    if (editingId && draftName.trim().length > 0) {
      renameTab(editingId, draftName.trim());
    }
    setEditingId(null);
  }

  function handleTabKeyDown(e: KeyboardEvent<HTMLDivElement>, id: string) {
    // Ignore keydowns bubbling up from the rename input so typing a space
    // while editing doesn't get hijacked by tab activation.
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      selectTab(id);
    }
  }

  return (
    <div className="tab-bar-region">
      <div className="tab-bar" role="tablist">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            role="tab"
            aria-selected={tab.id === activeTabId}
            tabIndex={0}
            className="tab"
            onClick={() => selectTab(tab.id)}
            onDoubleClick={() => startEditing(tab.id, tab.name)}
            onKeyDown={(e) => handleTabKeyDown(e, tab.id)}
          >
            {editingId === tab.id ? (
              <input
                autoFocus
                value={draftName}
                aria-label={`Rename tab ${tab.name}`}
                onChange={(e) => setDraftName(e.target.value)}
                onBlur={commitEditing}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitEditing();
                  if (e.key === "Escape") setEditingId(null);
                }}
              />
            ) : (
              <span>{tab.name}</span>
            )}
          </div>
        ))}
        <button type="button" aria-label="New tab" onClick={() => addTab("New Tab")}>
          +
        </button>
      </div>
      {error && (
        <p role="alert" className="tab-bar-error">
          {error}
        </p>
      )}
    </div>
  );
}
