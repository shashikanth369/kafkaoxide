export interface FontFamilyDef {
  id: string;
  label: string;
  cssValue: string;
}

export const FONT_FAMILIES: FontFamilyDef[] = [
  { id: "system-ui", label: "System UI", cssValue: '-apple-system, "Segoe UI", sans-serif' },
  { id: "inter", label: "Inter", cssValue: 'Inter, -apple-system, "Segoe UI", sans-serif' },
  { id: "jetbrains-mono", label: "JetBrains Mono", cssValue: '"JetBrains Mono", Menlo, Consolas, monospace' },
  { id: "menlo", label: "Menlo", cssValue: "Menlo, Consolas, monospace" },
];

export const DEFAULT_FONT_FAMILY_ID = "system-ui";

export const MIN_FONT_SIZE_PX = 11;
export const MAX_FONT_SIZE_PX = 18;
export const DEFAULT_FONT_SIZE_PX = 13;

export function fontFamilyCssValue(id: string): string {
  return FONT_FAMILIES.find((f) => f.id === id)?.cssValue ?? FONT_FAMILIES[0].cssValue;
}
