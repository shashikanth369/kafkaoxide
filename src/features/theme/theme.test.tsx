import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "./ThemeProvider";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { useThemeStore } from "./useThemeStore";
import { DEFAULT_THEME_ID } from "./themes";

beforeEach(() => {
  localStorage.clear();
  useThemeStore.setState({ appliedThemeId: DEFAULT_THEME_ID, previewThemeId: null });
});

describe("theme hover preview", () => {
  it("applies the default theme on mount", () => {
    render(
      <ThemeProvider>
        <div>content</div>
      </ThemeProvider>,
    );
    expect(document.documentElement.getAttribute("data-theme")).toBe(DEFAULT_THEME_ID);
  });

  it("previews a theme on hover without committing it", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeSwitcher />
      </ThemeProvider>,
    );

    await user.hover(screen.getByRole("button", { name: "Zed Light" }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("zed-light");
    expect(useThemeStore.getState().appliedThemeId).toBe(DEFAULT_THEME_ID);
  });

  it("reverts to the applied theme when the pointer leaves", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeSwitcher />
      </ThemeProvider>,
    );

    await user.hover(screen.getByRole("button", { name: "Zed Light" }));
    await user.unhover(screen.getByRole("button", { name: "Zed Light" }));
    expect(document.documentElement.getAttribute("data-theme")).toBe(DEFAULT_THEME_ID);
  });

  it("commits the theme on click", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeSwitcher />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Zed Light" }));
    expect(useThemeStore.getState().appliedThemeId).toBe("zed-light");
    expect(localStorage.getItem("kafkaoxide.theme")).toBe("zed-light");
  });
});
