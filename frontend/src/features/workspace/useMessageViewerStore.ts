import { create } from "zustand";
import { TopicMessage } from "../../lib/tauri";

interface MessageViewerState {
  /** The active tab's viewed message — kept in sync with `byTab[activeTabId]` by `setActiveTab`. */
  message: TopicMessage | null;
  activeTabId: string | null;
  /** Per-tab cache, so each tab's right pane stays independent. */
  byTab: Record<string, TopicMessage | null>;
  /** Called whenever the active tab changes, so writes below land in the right tab's slot. */
  setActiveTab: (tabId: string | null) => void;
  viewMessage: (message: TopicMessage) => void;
  clear: () => void;
  /** Resets a tab's cached message back to blank — the Bottom panel's "Clear memory" button. Defaults to the active tab. */
  clearTabMemory: (tabId?: string) => void;
}

/** Drives the right pane's payload viewer — set when a row is clicked in the topic Data tab's grid. */
export const useMessageViewerStore = create<MessageViewerState>((set, get) => {
  function write(message: TopicMessage | null) {
    const tabId = get().activeTabId;
    set((state) => ({
      message,
      byTab: tabId ? { ...state.byTab, [tabId]: message } : state.byTab,
    }));
  }

  return {
    message: null,
    activeTabId: null,
    byTab: {},
    setActiveTab: (tabId) =>
      set((state) => ({ activeTabId: tabId, message: (tabId ? state.byTab[tabId] : null) ?? null })),
    viewMessage: (message) => write(message),
    clear: () => write(null),
    clearTabMemory: (tabId) => {
      const target = tabId ?? get().activeTabId;
      if (!target) return;
      set((state) => ({
        byTab: { ...state.byTab, [target]: null },
        message: state.activeTabId === target ? null : state.message,
      }));
    },
  };
});
