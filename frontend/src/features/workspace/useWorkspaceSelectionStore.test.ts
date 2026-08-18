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

  it("selects a broker", () => {
    useWorkspaceSelectionStore.getState().selectBroker("conn-1", 3);
    expect(useWorkspaceSelectionStore.getState().selection).toEqual({
      type: "broker",
      connectionId: "conn-1",
      brokerId: 3,
    });
  });

  it("selects a topic", () => {
    useWorkspaceSelectionStore.getState().selectTopic("conn-1", "orders");
    expect(useWorkspaceSelectionStore.getState().selection).toEqual({
      type: "topic",
      connectionId: "conn-1",
      topicName: "orders",
    });
  });

  it("selects a consumer group", () => {
    useWorkspaceSelectionStore.getState().selectConsumerGroup("conn-1", "billing");
    expect(useWorkspaceSelectionStore.getState().selection).toEqual({
      type: "consumerGroup",
      connectionId: "conn-1",
      groupId: "billing",
    });
  });

  it("replaces a broker selection with a topic selection", () => {
    useWorkspaceSelectionStore.getState().selectBroker("conn-1", 3);
    useWorkspaceSelectionStore.getState().selectTopic("conn-1", "orders");
    expect(useWorkspaceSelectionStore.getState().selection).toEqual({
      type: "topic",
      connectionId: "conn-1",
      topicName: "orders",
    });
  });
});
