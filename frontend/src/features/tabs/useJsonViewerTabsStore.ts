import { create } from "zustand";

export interface JsonViewerTab {
  id: string;
  title: string;
  value: unknown;
}

interface JsonViewerTabsState {
  tabs: JsonViewerTab[];
  /** Creates a new ephemeral viewer tab and returns its id — doesn't activate it, callers do that via useTabsStore.selectTab. */
  openTab: (title: string, value: unknown) => string;
  closeTab: (id: string) => void;
}

function generateId(): string {
  return `json-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * "Open in new tab" on a JSON value opens it as a tab in the app's own tab
 * bar (there's no browser to open a real new tab in — this is a desktop
 * webview). These tabs are local-only, ephemeral scratch views — unlike
 * useTabsStore's tabs, they're never persisted to the backend, so a
 * "Fetch payload" click doesn't need a delete/rename/reorder round trip
 * for something meant to be glanced at and closed.
 */
export const useJsonViewerTabsStore = create<JsonViewerTabsState>((set) => ({
  tabs: [],
  openTab: (title, value) => {
    const id = generateId();
    set((state) => ({ tabs: [...state.tabs, { id, title, value }] }));
    return id;
  },
  closeTab: (id) => {
    set((state) => ({ tabs: state.tabs.filter((tab) => tab.id !== id) }));
  },
}));
