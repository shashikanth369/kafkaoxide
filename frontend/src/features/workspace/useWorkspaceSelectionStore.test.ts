import { describe, expect, it, beforeEach } from "vitest";
import { useWorkspaceSelectionStore } from "./useWorkspaceSelectionStore";

beforeEach(() => {
  useWorkspaceSelectionStore.setState({ selection: null });
});

describe("useWorkspaceSelectionStore", () => {
  it("starts with nothing selected", () => {
    expect(useWorkspaceSelectionStore.getState().selection).toBeNull();
  });

  it("selects a connection", () => {
    useWorkspaceSelectionStore.getState().selectConnection("conn-1");
    expect(useWorkspaceSelectionStore.getState().selection).toEqual({ type: "connection", id: "conn-1" });
  });

  it("replaces the previous selection when a different connection is selected", () => {
    useWorkspaceSelectionStore.getState().selectConnection("conn-1");
    useWorkspaceSelectionStore.getState().selectConnection("conn-2");
    expect(useWorkspaceSelectionStore.getState().selection).toEqual({ type: "connection", id: "conn-2" });
  });

  it("clears the selection", () => {
    useWorkspaceSelectionStore.getState().selectConnection("conn-1");
    useWorkspaceSelectionStore.getState().clearSelection();
    expect(useWorkspaceSelectionStore.getState().selection).toBeNull();
  });
});
