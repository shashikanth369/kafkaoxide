import { create } from "zustand";
import { api, Tab } from "../../lib/tauri";

interface TabsState {
  tabs: Tab[];
  activeTabId: string | null;
  error: string | null;
  loadTabs: () => Promise<void>;
  addTab: (name: string) => Promise<void>;
  renameTab: (id: string, name: string) => Promise<void>;
  deleteTab: (id: string) => Promise<void>;
  selectTab: (id: string) => void;
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export const useTabsStore = create<TabsState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  error: null,
  loadTabs: async () => {
    try {
      const tabs = await api.listTabs();
      set({
        tabs,
        activeTabId: get().activeTabId ?? tabs[0]?.id ?? null,
        error: null,
      });
    } catch (err) {
      set({ error: errorMessage(err, "Failed to load tabs") });
    }
  },
  addTab: async (name: string) => {
    try {
      const tab = await api.createTab(name);
      set((state) => ({ tabs: [...state.tabs, tab], activeTabId: tab.id, error: null }));
    } catch (err) {
      set({ error: errorMessage(err, "Failed to create tab") });
    }
  },
  renameTab: async (id: string, name: string) => {
    try {
      await api.renameTab(id, name);
      set((state) => ({
        tabs: state.tabs.map((tab) => (tab.id === id ? { ...tab, name } : tab)),
        error: null,
      }));
    } catch (err) {
      set({ error: errorMessage(err, "Failed to rename tab") });
    }
  },
  deleteTab: async (id: string) => {
    try {
      await api.deleteTab(id);
      set((state) => {
        const tabs = state.tabs.filter((tab) => tab.id !== id);
        if (state.activeTabId !== id) {
          return { tabs, error: null };
        }
        const closedIndex = state.tabs.findIndex((tab) => tab.id === id);
        const fallback = state.tabs[closedIndex - 1] ?? state.tabs[closedIndex + 1] ?? null;
        return { tabs, activeTabId: fallback?.id ?? null, error: null };
      });
    } catch (err) {
      set({ error: errorMessage(err, "Failed to delete tab") });
    }
  },
  selectTab: (id: string) => set({ activeTabId: id }),
}));
