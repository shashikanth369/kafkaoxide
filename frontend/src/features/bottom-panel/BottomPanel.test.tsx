import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLogsStore } from "./useLogsStore";
import { BottomPanel } from "./BottomPanel";
import { useWorkspaceSelectionStore } from "../workspace/useWorkspaceSelectionStore";
import { useMessageViewerStore } from "../workspace/useMessageViewerStore";

let capturedHandler: ((event: { payload: unknown }) => void) | null = null;

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn((_event: string, handler: (event: { payload: unknown }) => void) => {
    capturedHandler = handler;
    return Promise.resolve(() => {});
  }),
}));

beforeEach(() => {
  localStorage.clear();
  useLogsStore.setState({ entries: [], isExpanded: false });
  useWorkspaceSelectionStore.setState({ selection: null, activeTabId: null, byTab: {} });
  useMessageViewerStore.setState({ message: null, activeTabId: null, byTab: {} });
  capturedHandler = null;
});

describe("BottomPanel logs tool", () => {
  it("is collapsed by default", () => {
    render(<BottomPanel />);
    expect(screen.queryByText("No log entries yet.")).not.toBeInTheDocument();
  });

  it("expands when the toggle icon is clicked", async () => {
    const user = userEvent.setup();
    render(<BottomPanel />);

    await user.click(screen.getByLabelText("Toggle logs panel"));

    expect(screen.getByText("No log entries yet.")).toBeInTheDocument();
  });

  it("collapses again on a second click", async () => {
    const user = userEvent.setup();
    render(<BottomPanel />);

    await user.click(screen.getByLabelText("Toggle logs panel"));
    await user.click(screen.getByLabelText("Toggle logs panel"));

    expect(screen.queryByText("No log entries yet.")).not.toBeInTheDocument();
  });

  it("renders a log entry pushed over the tauri event channel once expanded", async () => {
    const user = userEvent.setup();
    render(<BottomPanel />);
    await user.click(screen.getByLabelText("Toggle logs panel"));

    await vi.waitFor(() => expect(capturedHandler).not.toBeNull());
    capturedHandler!({
      payload: {
        timestamp: "2026-08-18T00:00:00Z",
        level: "info",
        message: 'Created connection "Local Kafka"',
      },
    });

    expect(await screen.findByText('Created connection "Local Kafka"')).toBeInTheDocument();
  });
});

describe("BottomPanel tab memory", () => {
  it("shows Empty when the active tab has no selection", () => {
    render(<BottomPanel />);
    expect(screen.getByText("Tab memory: Empty")).toBeInTheDocument();
  });

  it("describes the active tab's current selection", () => {
    useWorkspaceSelectionStore.setState({
      selection: { type: "topic", connectionId: "1", topicName: "orders" },
    });
    render(<BottomPanel />);
    expect(screen.getByText("Tab memory: Topic orders")).toBeInTheDocument();
  });

  it("shows the actual cluster name for a connection selection, not a generic label", () => {
    useWorkspaceSelectionStore.setState({
      selection: { type: "connection", id: "1", name: "Local Kafka" },
    });
    render(<BottomPanel />);
    expect(screen.getByText("Tab memory: Cluster Local Kafka")).toBeInTheDocument();
  });

  it("clears both the selection and the message viewer for the active tab when Clear memory is clicked", async () => {
    useWorkspaceSelectionStore.setState({
      activeTabId: "tab-1",
      selection: { type: "topic", connectionId: "1", topicName: "orders" },
      byTab: { "tab-1": { type: "topic", connectionId: "1", topicName: "orders" } },
    });
    useMessageViewerStore.setState({
      activeTabId: "tab-1",
      message: { partition: 0, offset: 1, timestampMs: null, key: null, payloadBase64: null },
      byTab: { "tab-1": { partition: 0, offset: 1, timestampMs: null, key: null, payloadBase64: null } },
    });
    const user = userEvent.setup();
    render(<BottomPanel />);

    await user.click(screen.getByLabelText("Clear tab memory"));

    expect(screen.getByText("Tab memory: Empty")).toBeInTheDocument();
    expect(useMessageViewerStore.getState().message).toBeNull();
  });
});
