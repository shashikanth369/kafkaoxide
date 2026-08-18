import { create } from "zustand";
import { TopicMessage } from "../../lib/tauri";

interface MessageViewerState {
  message: TopicMessage | null;
  viewMessage: (message: TopicMessage) => void;
  clear: () => void;
}

/** Drives the right pane's payload viewer — set when a row is clicked in the topic Data tab's grid. */
export const useMessageViewerStore = create<MessageViewerState>((set) => ({
  message: null,
  viewMessage: (message: TopicMessage) => set({ message }),
  clear: () => set({ message: null }),
}));
