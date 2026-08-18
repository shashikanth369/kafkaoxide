import { useState } from "react";
import { useTabsStore } from "./useTabsStore";

export function TabBar() {
  const tabs = useTabsStore((s) => s.tabs);
  const activeTabId = useTabsStore((s) => s.activeTabId);
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

  return (
    <div className="tab-bar" role="tablist">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tab"
          aria-selected={tab.id === activeTabId}
          className="tab"
          onClick={() => selectTab(tab.id)}
          onDoubleClick={() => startEditing(tab.id, tab.name)}
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
  );
}
