import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import { setInvokeHandlers } from "../../lib/testInvoke";
import { useTabsStore } from "./useTabsStore";
import { TabBar } from "./TabBar";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

beforeEach(() => {
  useTabsStore.setState({ tabs: [], activeTabId: null });
});

describe("TabBar", () => {
  it("renders tabs and selects one on click", async () => {
    useTabsStore.setState({
      tabs: [
        { id: "1", name: "Alpha", position: 0 },
        { id: "2", name: "Beta", position: 1 },
      ],
      activeTabId: "1",
    });
    const user = userEvent.setup();
    render(<TabBar />);

    await user.click(screen.getByText("Beta"));
    expect(useTabsStore.getState().activeTabId).toBe("2");
  });

  it("renames a tab via double-click, edit, and Enter", async () => {
    setInvokeHandlers({ tab_rename: () => undefined });
    useTabsStore.setState({
      tabs: [{ id: "1", name: "Alpha", position: 0 }],
      activeTabId: "1",
    });
    const user = userEvent.setup();
    render(<TabBar />);

    await user.dblClick(screen.getByText("Alpha"));
    const input = screen.getByLabelText("Rename tab Alpha");
    await user.clear(input);
    await user.type(input, "Renamed{Enter}");

    await waitFor(() => {
      expect(useTabsStore.getState().tabs[0].name).toBe("Renamed");
    });
    expect(invoke).toHaveBeenCalledWith("tab_rename", { id: "1", name: "Renamed" });
  });

  it("adds a new tab", async () => {
    setInvokeHandlers({
      tab_create: (args: any) => ({ id: "new-1", name: args.name, position: 1 }),
    });
    useTabsStore.setState({
      tabs: [{ id: "1", name: "Alpha", position: 0 }],
      activeTabId: "1",
    });
    const user = userEvent.setup();
    render(<TabBar />);

    await user.click(screen.getByLabelText("New tab"));

    await waitFor(() => {
      expect(useTabsStore.getState().tabs).toHaveLength(2);
    });
    expect(useTabsStore.getState().activeTabId).toBe("new-1");
  });
});
