import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { useLogsStore } from "./useLogsStore";
import { BottomPanel } from "./BottomPanel";

let capturedHandler: ((event: { payload: unknown }) => void) | null = null;

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn((_event: string, handler: (event: { payload: unknown }) => void) => {
    capturedHandler = handler;
    return Promise.resolve(() => {});
  }),
}));

beforeEach(() => {
  useLogsStore.setState({ entries: [] });
  capturedHandler = null;
});

describe("BottomPanel logs tool", () => {
  it("shows an empty state with no log entries", () => {
    render(<BottomPanel />);
    expect(screen.getByText("No log entries yet.")).toBeInTheDocument();
  });

  it("renders a log entry pushed over the tauri event channel", async () => {
    render(<BottomPanel />);

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
