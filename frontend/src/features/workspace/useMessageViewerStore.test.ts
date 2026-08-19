import { beforeEach, describe, expect, it } from "vitest";
import { useMessageViewerStore } from "./useMessageViewerStore";

const sample = { partition: 0, offset: 1, timestampMs: 123, key: "k", payloadBase64: "eA==" };

beforeEach(() => {
  useMessageViewerStore.setState({ message: null, activeTabId: null, byTab: {} });
});

describe("useMessageViewerStore", () => {
  it("starts with no message selected", () => {
    expect(useMessageViewerStore.getState().message).toBeNull();
  });

  it("shows the selected message", () => {
    useMessageViewerStore.getState().viewMessage(sample);
    expect(useMessageViewerStore.getState().message).toEqual(sample);
  });

  it("clears the selection", () => {
    useMessageViewerStore.getState().viewMessage(sample);
    useMessageViewerStore.getState().clear();
    expect(useMessageViewerStore.getState().message).toBeNull();
  });
});

describe("useMessageViewerStore per-tab isolation", () => {
  const other = { partition: 1, offset: 9, timestampMs: null, key: null, payloadBase64: null };

  it("keeps each tab's viewed message independent", () => {
    const store = useMessageViewerStore.getState();
    store.setActiveTab("tab-1");
    store.viewMessage(sample);

    store.setActiveTab("tab-2");
    expect(useMessageViewerStore.getState().message).toBeNull();
    store.viewMessage(other);

    store.setActiveTab("tab-1");
    expect(useMessageViewerStore.getState().message).toEqual(sample);

    store.setActiveTab("tab-2");
    expect(useMessageViewerStore.getState().message).toEqual(other);
  });

  it("clearTabMemory resets the active tab's message without touching other tabs", () => {
    const store = useMessageViewerStore.getState();
    store.setActiveTab("tab-1");
    store.viewMessage(sample);
    store.setActiveTab("tab-2");
    store.viewMessage(other);

    store.clearTabMemory();
    expect(useMessageViewerStore.getState().message).toBeNull();

    store.setActiveTab("tab-1");
    expect(useMessageViewerStore.getState().message).toEqual(sample);
  });
});
