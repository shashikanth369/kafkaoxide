export interface ThemeDef {
  id: string;
  label: string;
  kind: "light" | "dark";
}

export const THEMES: ThemeDef[] = [
  { id: "zed-dark", label: "Zed Dark", kind: "dark" },
  { id: "zed-light", label: "Zed Light", kind: "light" },
  { id: "ayu-dark", label: "Ayu Dark", kind: "dark" },
];

export const DEFAULT_THEME_ID = "zed-dark";
