import { create } from "zustand";

/**
 * What's currently selected in the connection tree and shown in the middle
 * pane. A discriminated union so each selection kind's own identifying
 * fields stay distinct.
 */
export type WorkspaceSelection =
  | { type: "connection"; id: string }
  | { type: "broker"; connectionId: string; brokerId: number }
  | { type: "topic"; connectionId: string; topicName: string }
  | { type: "consumerGroup"; connectionId: string; groupId: string }
  | null;

interface WorkspaceSelectionState {
  selection: WorkspaceSelection;
  selectConnection: (id: string) => void;
  selectBroker: (connectionId: string, brokerId: number) => void;
  selectTopic: (connectionId: string, topicName: string) => void;
  selectConsumerGroup: (connectionId: string, groupId: string) => void;
  clearSelection: () => void;
}

export const useWorkspaceSelectionStore = create<WorkspaceSelectionState>((set) => ({
  selection: null,
  selectConnection: (id: string) => set({ selection: { type: "connection", id } }),
  selectBroker: (connectionId: string, brokerId: number) =>
    set({ selection: { type: "broker", connectionId, brokerId } }),
  selectTopic: (connectionId: string, topicName: string) =>
    set({ selection: { type: "topic", connectionId, topicName } }),
  selectConsumerGroup: (connectionId: string, groupId: string) =>
    set({ selection: { type: "consumerGroup", connectionId, groupId } }),
  clearSelection: () => set({ selection: null }),
}));
