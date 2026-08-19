import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeDropdown } from "./ThemeDropdown";
import { useThemeStore } from "./useThemeStore";
import { DEFAULT_THEME_ID } from "./themes";

beforeEach(() => {
  localStorage.clear();
  useThemeStore.setState({ appliedThemeId: DEFAULT_THEME_ID });
});

describe("ThemeDropdown", () => {
  it("marks the currently applied theme's option with a checkmark", () => {
    render(<ThemeDropdown />);
    const option = screen.getByRole("option", { name: "✓ Zed Dark" }) as HTMLOptionElement;
    expect(option.selected).toBe(true);
  });

  it("applies the selected theme immediately and persists it", async () => {
    const user = userEvent.setup();
    render(<ThemeDropdown />);

    await user.selectOptions(screen.getByLabelText("Theme"), "zed-light");

    expect(useThemeStore.getState().appliedThemeId).toBe("zed-light");
    expect(localStorage.getItem("kafkaoxide.theme")).toBe("zed-light");
  });
});
