import { useState } from "react";
import { ThemeDropdown } from "../theme/ThemeDropdown";
import { FONT_FAMILIES, MAX_FONT_SIZE_PX, MIN_FONT_SIZE_PX } from "./fonts";
import { activeFontFamilyId, usePreferencesStore } from "./usePreferencesStore";

export function SettingsPanel() {
  const appliedFontFamilyId = usePreferencesStore((s) => s.appliedFontFamilyId);
  const previewFontFamilyId = usePreferencesStore((s) => s.previewFontFamilyId);
  const setPreviewFontFamily = usePreferencesStore((s) => s.setPreviewFontFamily);
  const setAppliedFontFamily = usePreferencesStore((s) => s.setAppliedFontFamily);
  const fontSizePx = usePreferencesStore((s) => s.fontSizePx);
  const setFontSizePx = usePreferencesStore((s) => s.setFontSizePx);
  const [fontMenuOpen, setFontMenuOpen] = useState(false);

  const displayedFamily = FONT_FAMILIES.find(
    (f) => f.id === activeFontFamilyId({ appliedFontFamilyId, previewFontFamilyId }),
  )!;

  return (
    <div className="settings-panel">
      <h2>Settings</h2>

      <ThemeDropdown />

      <div className="settings-field">
        <span>Font style</span>
        <div className="settings-dropdown">
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={fontMenuOpen}
            onClick={() => setFontMenuOpen((v) => !v)}
          >
            {displayedFamily.label} ▾
          </button>
          {fontMenuOpen && (
            <ul role="listbox" aria-label="Font style" onMouseLeave={() => setPreviewFontFamily(null)}>
              {FONT_FAMILIES.map((f) => (
                <li
                  key={f.id}
                  role="option"
                  aria-selected={f.id === appliedFontFamilyId}
                  onMouseEnter={() => setPreviewFontFamily(f.id)}
                  onClick={() => {
                    setAppliedFontFamily(f.id);
                    setFontMenuOpen(false);
                  }}
                >
                  {f.id === appliedFontFamilyId ? `✓ ${f.label}` : f.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <label className="settings-field">
        <span>Font size ({fontSizePx}px)</span>
        <input
          type="range"
          aria-label="Font size"
          min={MIN_FONT_SIZE_PX}
          max={MAX_FONT_SIZE_PX}
          step={1}
          value={fontSizePx}
          onChange={(e) => setFontSizePx(Number(e.target.value))}
        />
      </label>
    </div>
  );
}
