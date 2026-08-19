import { beforeEach, describe, expect, it } from "vitest";
import { useJsonViewerTabsStore } from "./useJsonViewerTabsStore";

beforeEach(() => {
  useJsonViewerTabsStore.setState({ tabs: [] });
});

describe("useJsonViewerTabsStore", () => {
  it("starts with no tabs", () => {
    expect(useJsonViewerTabsStore.getState().tabs).toEqual([]);
  });

  it("opens a new tab and returns its id", () => {
    const id = useJsonViewerTabsStore.getState().openTab("Partition 0 · Offset 1", { a: 1 });

    const tabs = useJsonViewerTabsStore.getState().tabs;
    expect(tabs).toHaveLength(1);
    expect(tabs[0]).toEqual({ id, title: "Partition 0 · Offset 1", value: { a: 1 } });
  });

  it("gives each opened tab a distinct id", () => {
    const id1 = useJsonViewerTabsStore.getState().openTab("a", {});
    const id2 = useJsonViewerTabsStore.getState().openTab("b", {});

    expect(id1).not.toBe(id2);
    expect(useJsonViewerTabsStore.getState().tabs).toHaveLength(2);
  });

  it("closes a tab by id, leaving the others", () => {
    const id1 = useJsonViewerTabsStore.getState().openTab("a", {});
    const id2 = useJsonViewerTabsStore.getState().openTab("b", {});

    useJsonViewerTabsStore.getState().closeTab(id1);

    const tabs = useJsonViewerTabsStore.getState().tabs;
    expect(tabs).toHaveLength(1);
    expect(tabs[0].id).toBe(id2);
  });

  it("closing an id that isn't open is a no-op", () => {
    useJsonViewerTabsStore.getState().openTab("a", {});

    useJsonViewerTabsStore.getState().closeTab("does-not-exist");

    expect(useJsonViewerTabsStore.getState().tabs).toHaveLength(1);
  });
});
