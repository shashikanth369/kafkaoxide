import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setInvokeHandlers } from "../../lib/testInvoke";
import { ConnectionTree } from "./ConnectionTree";
import { useWorkspaceSelectionStore } from "../workspace/useWorkspaceSelectionStore";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

function sampleConnection(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "1",
    name: "Local Kafka",
    bootstrapServers: "localhost:9092",
    securityProtocol: "PLAINTEXT",
    saslMechanism: null,
    saslUsername: null,
    createdAt: "2026-08-18T00:00:00Z",
    updatedAt: "2026-08-18T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  useWorkspaceSelectionStore.setState({ selection: null });
});

describe("ConnectionTree", () => {
  it("shows an empty state when there are no connections", async () => {
    setInvokeHandlers({ connection_list: () => [] });
    renderWithClient(<ConnectionTree />);

    expect(await screen.findByText("No connections yet. Add one to get started.")).toBeInTheDocument();
  });

  it("renders a green status dot only when reachable AND explicitly connected", async () => {
    const checkStatus = vi.fn(() => "REACHABLE");
    const isConnected = vi.fn(() => true);
    setInvokeHandlers({
      connection_list: () => [sampleConnection()],
      connection_check_status: checkStatus,
      connection_is_connected: isConnected,
    });
    renderWithClient(<ConnectionTree />);

    await screen.findByText("Local Kafka");
    await waitFor(() => expect(checkStatus).toHaveBeenCalled());
    await waitFor(() => expect(isConnected).toHaveBeenCalled());
    await waitFor(() => {
      expect(screen.getByTestId("status-1").className).toContain("status-dot--green");
    });
  });

  it("renders a gray status dot when reachable but not yet connected", async () => {
    const checkStatus = vi.fn(() => "REACHABLE");
    const isConnected = vi.fn(() => false);
    setInvokeHandlers({
      connection_list: () => [sampleConnection()],
      connection_check_status: checkStatus,
      connection_is_connected: isConnected,
    });
    renderWithClient(<ConnectionTree />);

    await screen.findByText("Local Kafka");
    await waitFor(() => expect(checkStatus).toHaveBeenCalled());
    await waitFor(() => expect(isConnected).toHaveBeenCalled());
    await waitFor(() => {
      expect(screen.getByTestId("status-1").className).toContain("status-dot--gray");
    });
    expect(screen.getByTestId("status-1").className).not.toContain("status-dot--green");
  });

  it("renders a red status dot for an unreachable connection, regardless of connected state", async () => {
    const checkStatus = vi.fn(() => "UNREACHABLE");
    setInvokeHandlers({
      connection_list: () => [sampleConnection({ id: "2", name: "Broken Kafka" })],
      connection_check_status: checkStatus,
      connection_is_connected: () => true,
    });
    renderWithClient(<ConnectionTree />);

    await screen.findByText("Broken Kafka");
    await waitFor(() => expect(checkStatus).toHaveBeenCalled());
    await waitFor(() => {
      expect(screen.getByTestId("status-2").className).toContain("status-dot--red");
    });
  });

  it("selects the connection in the workspace store when clicked", async () => {
    setInvokeHandlers({
      connection_list: () => [sampleConnection()],
      connection_check_status: () => "UNKNOWN",
      connection_is_connected: () => false,
    });
    const user = userEvent.setup();
    renderWithClient(<ConnectionTree />);
    await screen.findByText("Local Kafka");

    await user.click(screen.getByTestId("connection-row-1"));

    expect(useWorkspaceSelectionStore.getState().selection).toEqual({ type: "connection", id: "1" });
  });

  it("marks the selected connection row visually", async () => {
    setInvokeHandlers({
      connection_list: () => [sampleConnection()],
      connection_check_status: () => "UNKNOWN",
      connection_is_connected: () => false,
    });
    const user = userEvent.setup();
    renderWithClient(<ConnectionTree />);
    await screen.findByText("Local Kafka");

    await user.click(screen.getByTestId("connection-row-1"));

    expect(screen.getByTestId("connection-row-1")).toHaveClass("connection-row--selected");
  });
});
