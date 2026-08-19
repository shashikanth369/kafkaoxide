import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import { setInvokeHandlers } from "../../lib/testInvoke";
import { useTabsStore } from "./useTabsStore";
import { useSettingsPanelStore } from "../settings/useSettingsPanelStore";
import { TabBar } from "./TabBar";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

function pointerEventAt(type: string, clientX: number): Event {
  const event = new Event(type, { bubbles: true });
  Object.defineProperty(event, "clientX", { value: clientX });
  Object.defineProperty(event, "button", { value: 0 });
  return event;
}

beforeEach(() => {
  useTabsStore.setState({ tabs: [], activeTabId: null, error: null });
  useSettingsPanelStore.setState({ isOpen: false });
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

  it("closes a tab via its close button without selecting it first", async () => {
    setInvokeHandlers({ tab_delete: () => undefined });
    useTabsStore.setState({
      tabs: [
        { id: "1", name: "Alpha", position: 0 },
        { id: "2", name: "Beta", position: 1 },
      ],
      activeTabId: "1",
    });
    const user = userEvent.setup();
    render(<TabBar />);

    await user.click(screen.getByLabelText("Close tab Beta"));

    await waitFor(() => {
      expect(useTabsStore.getState().tabs.map((t) => t.id)).toEqual(["1"]);
    });
    expect(useTabsStore.getState().activeTabId).toBe("1");
  });

  it("selects a tab via keyboard activation (Enter and Space)", async () => {
    useTabsStore.setState({
      tabs: [
        { id: "1", name: "Alpha", position: 0 },
        { id: "2", name: "Beta", position: 1 },
      ],
      activeTabId: "1",
    });
    const user = userEvent.setup();
    render(<TabBar />);

    const betaTab = screen.getByText("Beta").closest('[role="tab"]') as HTMLElement;
    betaTab.focus();
    await user.keyboard("{Enter}");
    expect(useTabsStore.getState().activeTabId).toBe("2");

    const alphaTab = screen.getByText("Alpha").closest('[role="tab"]') as HTMLElement;
    alphaTab.focus();
    await user.keyboard(" ");
    expect(useTabsStore.getState().activeTabId).toBe("1");
  });

  it("each tab is a keyboard tab stop", () => {
    useTabsStore.setState({
      tabs: [{ id: "1", name: "Alpha", position: 0 }],
      activeTabId: "1",
    });
    render(<TabBar />);

    expect(screen.getByRole("tab", { name: "Alpha" })).toHaveProperty("tabIndex", 0);
  });

  it("shows an alert message when renaming fails and clears it on next success", async () => {
    setInvokeHandlers({
      tab_rename: () => {
        throw new Error("rename failed: network error");
      },
    });
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

    expect(await screen.findByRole("alert")).toHaveTextContent("rename failed: network error");
    // The tab name is unchanged since the mutation failed.
    expect(useTabsStore.getState().tabs[0].name).toBe("Alpha");

    setInvokeHandlers({ tab_rename: () => undefined });
    await user.dblClick(screen.getByText("Alpha"));
    const retryInput = screen.getByLabelText("Rename tab Alpha");
    await user.clear(retryInput);
    await user.type(retryInput, "Renamed{Enter}");

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
    expect(useTabsStore.getState().tabs[0].name).toBe("Renamed");
  });

  it("shows an alert message when adding a tab fails", async () => {
    setInvokeHandlers({
      tab_create: () => {
        throw new Error("create failed");
      },
    });
    useTabsStore.setState({
      tabs: [{ id: "1", name: "Alpha", position: 0 }],
      activeTabId: "1",
    });
    const user = userEvent.setup();
    render(<TabBar />);

    await user.click(screen.getByLabelText("New tab"));

    expect(await screen.findByRole("alert")).toHaveTextContent("create failed");
    expect(useTabsStore.getState().tabs).toHaveLength(1);
  });

  it("shows a closable Settings pill when the settings panel is open", async () => {
    useSettingsPanelStore.setState({ isOpen: true });
    const user = userEvent.setup();
    render(<TabBar />);

    expect(screen.getByRole("tab", { name: "Settings" })).toHaveAttribute("aria-selected", "true");

    await user.click(screen.getByLabelText("Close tab Settings"));

    expect(useSettingsPanelStore.getState().isOpen).toBe(false);
  });

  it("does not show the Settings pill when the settings panel is closed", () => {
    render(<TabBar />);
    expect(screen.queryByRole("tab", { name: "Settings" })).not.toBeInTheDocument();
  });

  it("does not mark a regular tab as selected while Settings is open, even if it is the active tab", () => {
    useTabsStore.setState({
      tabs: [{ id: "1", name: "Alpha", position: 0 }],
      activeTabId: "1",
    });
    useSettingsPanelStore.setState({ isOpen: true });
    render(<TabBar />);

    expect(screen.getByRole("tab", { name: "Alpha" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: "Settings" })).toHaveAttribute("aria-selected", "true");
  });

  it("closes Settings when a regular tab is clicked while Settings is open", async () => {
    useTabsStore.setState({
      tabs: [{ id: "1", name: "Alpha", position: 0 }],
      activeTabId: "1",
    });
    useSettingsPanelStore.setState({ isOpen: true });
    const user = userEvent.setup();
    render(<TabBar />);

    await user.click(screen.getByText("Alpha"));

    expect(useSettingsPanelStore.getState().isOpen).toBe(false);
  });

  it("opens rename editing via right-click on a tab", () => {
    useTabsStore.setState({
      tabs: [{ id: "1", name: "Alpha", position: 0 }],
      activeTabId: "1",
    });
    render(<TabBar />);

    fireEvent.contextMenu(screen.getByText("Alpha"));

    expect(screen.getByLabelText("Rename tab Alpha")).toBeInTheDocument();
  });

  it("reorders tabs by dragging one past a neighbor, then persists the order on drop", async () => {
    setInvokeHandlers({ tab_reorder: () => undefined });
    useTabsStore.setState({
      tabs: [
        { id: "1", name: "Alpha", position: 0 },
        { id: "2", name: "Beta", position: 1 },
        { id: "3", name: "Gamma", position: 2 },
      ],
      activeTabId: "1",
    });
    render(<TabBar />);

    const alpha = screen.getByRole("tab", { name: "Alpha" });
    const beta = screen.getByRole("tab", { name: "Beta" });
    const gamma = screen.getByRole("tab", { name: "Gamma" });
    vi.spyOn(alpha, "getBoundingClientRect").mockReturnValue({ left: 0, right: 100 } as DOMRect);
    vi.spyOn(beta, "getBoundingClientRect").mockReturnValue({ left: 100, right: 200 } as DOMRect);
    vi.spyOn(gamma, "getBoundingClientRect").mockReturnValue({ left: 200, right: 300 } as DOMRect);

    act(() => {
      alpha.dispatchEvent(pointerEventAt("pointerdown", 10));
    });
    act(() => {
      window.dispatchEvent(pointerEventAt("pointermove", 250));
    });

    expect(useTabsStore.getState().tabs.map((t) => t.id)).toEqual(["2", "3", "1"]);

    act(() => {
      window.dispatchEvent(pointerEventAt("pointerup", 250));
    });

    await waitFor(() => expect(invoke).toHaveBeenCalledWith("tab_reorder", { ids: ["2", "3", "1"] }));
  });

  it("does not select a different tab as the side effect of a drag-to-reorder", async () => {
    setInvokeHandlers({ tab_reorder: () => undefined });
    useTabsStore.setState({
      tabs: [
        { id: "1", name: "Alpha", position: 0 },
        { id: "2", name: "Beta", position: 1 },
      ],
      activeTabId: "1",
    });
    render(<TabBar />);

    const alpha = screen.getByRole("tab", { name: "Alpha" });
    const beta = screen.getByRole("tab", { name: "Beta" });
    vi.spyOn(alpha, "getBoundingClientRect").mockReturnValue({ left: 0, right: 100 } as DOMRect);
    vi.spyOn(beta, "getBoundingClientRect").mockReturnValue({ left: 100, right: 200 } as DOMRect);

    act(() => {
      alpha.dispatchEvent(pointerEventAt("pointerdown", 10));
    });
    act(() => {
      window.dispatchEvent(pointerEventAt("pointermove", 150));
    });
    act(() => {
      window.dispatchEvent(pointerEventAt("pointerup", 150));
      // The pointerup lands over Beta's position — a real drag-release would
      // fire a native click on whatever element is now under the pointer.
      fireEvent.click(beta);
    });

    expect(useTabsStore.getState().activeTabId).toBe("1");
  });
});
