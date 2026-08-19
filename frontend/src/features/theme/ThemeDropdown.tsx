import { THEMES } from "./themes";
import { useThemeStore } from "./useThemeStore";

export function ThemeDropdown() {
  const appliedThemeId = useThemeStore((s) => s.appliedThemeId);
  const setApplied = useThemeStore((s) => s.setApplied);

  return (
    <label className="settings-field">
      <span>Theme</span>
      <select
        aria-label="Theme"
        value={appliedThemeId}
        onChange={(e) => setApplied(e.target.value)}
      >
        {THEMES.map((theme) => (
          <option key={theme.id} value={theme.id}>
            {theme.id === appliedThemeId ? `✓ ${theme.label}` : theme.label}
          </option>
        ))}
      </select>
    </label>
  );
}
