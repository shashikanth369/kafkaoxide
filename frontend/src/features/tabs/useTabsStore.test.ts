import { beforeEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { setInvokeHandlers } from "../../lib/testInvoke";
import { useTabsStore } from "./useTabsStore";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

beforeEach(() => {
  useTabsStore.setState({ tabs: [], activeTabId: null, error: null });
});

describe("useTabsStore deleteTab", () => {
  it("removes the tab from state and calls tab_delete", async () => {
    setInvokeHandlers({ tab_delete: () => undefined });
    useTabsStore.setState({
      tabs: [
        { id: "1", name: "Alpha", position: 0 },
        { id: "2", name: "Beta", position: 1 },
      ],
      activeTabId: "1",
    });

    await useTabsStore.getState().deleteTab("2");

    expect(useTabsStore.getState().tabs.map((t) => t.id)).toEqual(["1"]);
    expect(invoke).toHaveBeenCalledWith("tab_delete", { id: "2" });
  });

  it("falls back activeTabId to the previous tab when the active tab is closed", async () => {
    setInvokeHandlers({ tab_delete: () => undefined });
    useTabsStore.setState({
      tabs: [
        { id: "1", name: "Alpha", position: 0 },
        { id: "2", name: "Beta", position: 1 },
        { id: "3", name: "Gamma", position: 2 },
      ],
      activeTabId: "2",
    });

    await useTabsStore.getState().deleteTab("2");

    expect(useTabsStore.getState().activeTabId).toBe("1");
  });

  it("falls back activeTabId to the next tab when closing the first (active) tab", async () => {
    setInvokeHandlers({ tab_delete: () => undefined });
    useTabsStore.setState({
      tabs: [
        { id: "1", name: "Alpha", position: 0 },
        { id: "2", name: "Beta", position: 1 },
      ],
      activeTabId: "1",
    });

    await useTabsStore.getState().deleteTab("1");

    expect(useTabsStore.getState().activeTabId).toBe("2");
  });

  it("sets activeTabId to null when closing the last remaining tab", async () => {
    setInvokeHandlers({ tab_delete: () => undefined });
    useTabsStore.setState({
      tabs: [{ id: "1", name: "Alpha", position: 0 }],
      activeTabId: "1",
    });

    await useTabsStore.getState().deleteTab("1");

    expect(useTabsStore.getState().activeTabId).toBeNull();
  });

  it("leaves activeTabId unchanged when closing a non-active tab", async () => {
    setInvokeHandlers({ tab_delete: () => undefined });
    useTabsStore.setState({
      tabs: [
        { id: "1", name: "Alpha", position: 0 },
        { id: "2", name: "Beta", position: 1 },
      ],
      activeTabId: "1",
    });

    await useTabsStore.getState().deleteTab("2");

    expect(useTabsStore.getState().activeTabId).toBe("1");
  });

  it("sets an error and leaves state unchanged when the backend call fails", async () => {
    setInvokeHandlers({
      tab_delete: () => {
        throw new Error("delete failed");
      },
    });
    useTabsStore.setState({
      tabs: [{ id: "1", name: "Alpha", position: 0 }],
      activeTabId: "1",
    });

    await useTabsStore.getState().deleteTab("1");

    expect(useTabsStore.getState().tabs).toHaveLength(1);
    expect(useTabsStore.getState().error).toBe("delete failed");
  });
});
