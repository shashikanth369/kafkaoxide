import { beforeEach, describe, expect, it } from "vitest";
import { useMessageViewerStore } from "./useMessageViewerStore";

const sample = { partition: 0, offset: 1, timestampMs: 123, key: "k", payloadBase64: "eA==" };

beforeEach(() => {
  useMessageViewerStore.setState({ message: null });
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
