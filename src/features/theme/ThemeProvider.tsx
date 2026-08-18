import { useEffect } from "react";
import { activeThemeId, useThemeStore } from "./useThemeStore";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const appliedThemeId = useThemeStore((s) => s.appliedThemeId);
  const previewThemeId = useThemeStore((s) => s.previewThemeId);
  const themeId = activeThemeId({ appliedThemeId, previewThemeId });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", themeId);
  }, [themeId]);

  return <>{children}</>;
}
