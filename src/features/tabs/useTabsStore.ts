import { create } from "zustand";
import { api, Tab } from "../../lib/tauri";

interface TabsState {
  tabs: Tab[];
  activeTabId: string | null;
  loadTabs: () => Promise<void>;
  addTab: (name: string) => Promise<void>;
  renameTab: (id: string, name: string) => Promise<void>;
  selectTab: (id: string) => void;
}

export const useTabsStore = create<TabsState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  loadTabs: async () => {
    const tabs = await api.listTabs();
    set({
      tabs,
      activeTabId: get().activeTabId ?? tabs[0]?.id ?? null,
    });
  },
  addTab: async (name: string) => {
    const tab = await api.createTab(name);
    set((state) => ({ tabs: [...state.tabs, tab], activeTabId: tab.id }));
  },
  renameTab: async (id: string, name: string) => {
    await api.renameTab(id, name);
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === id ? { ...tab, name } : tab)),
    }));
  },
  selectTab: (id: string) => set({ activeTabId: id }),
}));
