import { THEMES } from "./themes";
import { useThemeStore } from "./useThemeStore";

export function ThemeSwitcher() {
  const appliedThemeId = useThemeStore((s) => s.appliedThemeId);
  const setApplied = useThemeStore((s) => s.setApplied);
  const setPreview = useThemeStore((s) => s.setPreview);

  return (
    <div className="theme-switcher">
      {THEMES.map((theme) => (
        <button
          key={theme.id}
          type="button"
          aria-pressed={theme.id === appliedThemeId}
          className="theme-swatch"
          onMouseEnter={() => setPreview(theme.id)}
          onMouseLeave={() => setPreview(null)}
          onClick={() => setApplied(theme.id)}
        >
          {theme.label}
        </button>
      ))}
    </div>
  );
}
