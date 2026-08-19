import { KeyboardEvent as ReactKeyboardEvent, useEffect, useRef, useState } from "react";
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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLLIElement | null>>([]);

  const displayedFamily = FONT_FAMILIES.find(
    (f) => f.id === activeFontFamilyId({ appliedFontFamilyId, previewFontFamilyId }),
  )!;

  function closeFontMenu() {
    setFontMenuOpen(false);
    setPreviewFontFamily(null);
  }

  function commitFontFamily(id: string) {
    setAppliedFontFamily(id);
    closeFontMenu();
    toggleButtonRef.current?.focus();
  }

  // Close the listbox on outside click and on Escape (from anywhere while it's open).
  useEffect(() => {
    if (!fontMenuOpen) return;

    function handlePointerDown(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        closeFontMenu();
      }
    }
    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") {
        closeFontMenu();
        toggleButtonRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontMenuOpen]);

  // Move focus onto the currently-applied option (or the first option) when the menu opens.
  useEffect(() => {
    if (!fontMenuOpen) return;
    const activeIndex = FONT_FAMILIES.findIndex((f) => f.id === appliedFontFamilyId);
    const index = activeIndex >= 0 ? activeIndex : 0;
    optionRefs.current[index]?.focus();
    // Only run when the menu transitions open; re-focusing on every appliedFontFamilyId
    // change would fight the user's own arrow-key navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontMenuOpen]);

  function handleOptionKeyDown(e: ReactKeyboardEvent<HTMLLIElement>, index: number, id: string) {
    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        const next = Math.min(index + 1, FONT_FAMILIES.length - 1);
        optionRefs.current[next]?.focus();
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        const prev = Math.max(index - 1, 0);
        optionRefs.current[prev]?.focus();
        break;
      }
      case "Enter":
      case " ":
        e.preventDefault();
        commitFontFamily(id);
        break;
      default:
        break;
    }
  }

  return (
    <div className="settings-panel">
      <h2>Settings</h2>

      <ThemeDropdown />

      <div className="settings-field">
        <span>Font style</span>
        <div className="settings-dropdown" ref={dropdownRef}>
          <button
            type="button"
            ref={toggleButtonRef}
            aria-haspopup="listbox"
            aria-expanded={fontMenuOpen}
            onClick={() => setFontMenuOpen((v) => !v)}
          >
            {displayedFamily.label} ▾
          </button>
          {fontMenuOpen && (
            <ul role="listbox" aria-label="Font style" onMouseLeave={() => setPreviewFontFamily(null)}>
              {FONT_FAMILIES.map((f, index) => (
                <li
                  key={f.id}
                  role="option"
                  tabIndex={-1}
                  ref={(el) => {
                    optionRefs.current[index] = el;
                  }}
                  aria-selected={f.id === appliedFontFamilyId}
                  onMouseEnter={() => setPreviewFontFamily(f.id)}
                  onClick={() => commitFontFamily(f.id)}
                  onKeyDown={(e) => handleOptionKeyDown(e, index, f.id)}
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
