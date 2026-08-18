import { create } from "zustand";

/**
 * What's currently selected in the connection tree and shown in the middle
 * pane. A discriminated union so later phases (broker/topic/consumer
 * selection) can extend this without touching connection-selection call
 * sites.
 */
export type WorkspaceSelection = { type: "connection"; id: string } | null;

interface WorkspaceSelectionState {
  selection: WorkspaceSelection;
  selectConnection: (id: string) => void;
  clearSelection: () => void;
}

export const useWorkspaceSelectionStore = create<WorkspaceSelectionState>((set) => ({
  selection: null,
  selectConnection: (id: string) => set({ selection: { type: "connection", id } }),
  clearSelection: () => set({ selection: null }),
}));
