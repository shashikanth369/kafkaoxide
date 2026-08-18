import { create } from "zustand";

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
}

interface LogsState {
  entries: LogEntry[];
  addEntry: (entry: LogEntry) => void;
}

export const useLogsStore = create<LogsState>((set) => ({
  entries: [],
  addEntry: (entry) => set((state) => ({ entries: [...state.entries, entry] })),
}));
