import { KeyboardEvent, PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import { useTabsStore } from "./useTabsStore";
import { useSettingsPanelStore } from "../settings/useSettingsPanelStore";

export function TabBar() {
  const tabs = useTabsStore((s) => s.tabs);
  const activeTabId = useTabsStore((s) => s.activeTabId);
  const error = useTabsStore((s) => s.error);
  const selectTab = useTabsStore((s) => s.selectTab);
  const renameTab = useTabsStore((s) => s.renameTab);
  const addTab = useTabsStore((s) => s.addTab);
  const deleteTab = useTabsStore((s) => s.deleteTab);
  const moveTab = useTabsStore((s) => s.moveTab);
  const commitTabOrder = useTabsStore((s) => s.commitTabOrder);
  const settingsOpen = useSettingsPanelStore((s) => s.isOpen);
  const closeSettings = useSettingsPanelStore((s) => s.close);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const tabRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const didReorderRef = useRef(false);

  function startEditing(id: string, currentName: string) {
    setEditingId(id);
    setDraftName(currentName);
  }

  function startDragging(e: ReactPointerEvent<HTMLDivElement>, id: string) {
    if (editingId) return;
    // Only the primary button/touch starts a drag — ignore right-click etc.
    if (e.button !== 0) return;
    didReorderRef.current = false;
    setDraggingId(id);
  }

  // Live-reorders the tabs array as the dragged tab's pointer crosses into a
  // neighboring tab's horizontal bounds (Chrome-style drag-to-reorder), and
  // persists the final order once the drag ends.
  useEffect(() => {
    if (!draggingId) return;

    function handlePointerMove(e: PointerEvent) {
      for (const tab of tabs) {
        if (tab.id === draggingId) continue;
        const el = tabRefs.current[tab.id];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right) {
          didReorderRef.current = true;
          moveTab(draggingId as string, tab.id);
          break;
        }
      }
    }

    function handlePointerUp() {
      setDraggingId(null);
      if (didReorderRef.current) {
        commitTabOrder();
      }
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggingId]);

  function handleTabClick(id: string) {
    if (didReorderRef.current) {
      didReorderRef.current = false;
      return;
    }
    selectTab(id);
    closeSettings();
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
      closeSettings();
    }
  }

  return (
    <div className="tab-bar-region">
      <div className="tab-bar" role="tablist">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            ref={(el) => {
              tabRefs.current[tab.id] = el;
            }}
            role="tab"
            aria-label={tab.name}
            aria-selected={tab.id === activeTabId && !settingsOpen}
            tabIndex={0}
            className={`tab${draggingId === tab.id ? " tab--dragging" : ""}`}
            onClick={() => handleTabClick(tab.id)}
            onDoubleClick={() => startEditing(tab.id, tab.name)}
            onContextMenu={(e) => {
              e.preventDefault();
              startEditing(tab.id, tab.name);
            }}
            onPointerDown={(e) => startDragging(e, tab.id)}
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
              <>
                <span>{tab.name}</span>
                <button
                  type="button"
                  className="tab-close"
                  aria-label={`Close tab ${tab.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTab(tab.id);
                  }}
                >
                  ×
                </button>
              </>
            )}
          </div>
        ))}
        {settingsOpen && (
          <div role="tab" aria-label="Settings" aria-selected="true" tabIndex={0} className="tab">
            <span>Settings</span>
            <button
              type="button"
              className="tab-close"
              aria-label="Close tab Settings"
              onClick={(e) => {
                e.stopPropagation();
                closeSettings();
              }}
            >
              ×
            </button>
          </div>
        )}
        <button type="button" className="tab-new" aria-label="New tab" onClick={() => addTab("New Tab")}>
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
