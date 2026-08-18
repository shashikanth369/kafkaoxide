import { create } from "zustand";
import { DEFAULT_THEME_ID } from "./themes";

interface ThemeState {
  appliedThemeId: string;
  previewThemeId: string | null;
  setApplied: (id: string) => void;
  setPreview: (id: string | null) => void;
}

const STORAGE_KEY = "kafkaoxide.theme";

function loadStoredTheme(): string {
  if (typeof localStorage === "undefined") return DEFAULT_THEME_ID;
  return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_THEME_ID;
}

export const useThemeStore = create<ThemeState>((set) => ({
  appliedThemeId: loadStoredTheme(),
  previewThemeId: null,
  setApplied: (id) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, id);
    }
    set({ appliedThemeId: id, previewThemeId: null });
  },
  setPreview: (id) => set({ previewThemeId: id }),
}));

export function activeThemeId(state: Pick<ThemeState, "appliedThemeId" | "previewThemeId">): string {
  return state.previewThemeId ?? state.appliedThemeId;
}
