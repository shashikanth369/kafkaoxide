import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setInvokeHandlers } from "../../lib/testInvoke";
import { ConnectionTree } from "./ConnectionTree";

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
});

describe("ConnectionTree", () => {
  it("shows an empty state when there are no connections", async () => {
    setInvokeHandlers({ connection_list: () => [] });
    renderWithClient(<ConnectionTree />);

    expect(await screen.findByText("No connections yet. Add one to get started.")).toBeInTheDocument();
  });

  it("renders a green status dot for a reachable connection", async () => {
    setInvokeHandlers({
      connection_list: () => [sampleConnection()],
      connection_check_status: () => "REACHABLE",
    });
    renderWithClient(<ConnectionTree />);

    await screen.findByText("Local Kafka");
    await waitFor(() => {
      expect(screen.getByTestId("status-1").className).toContain("status-dot--green");
    });
  });

  it("renders a red status dot for an unreachable connection", async () => {
    setInvokeHandlers({
      connection_list: () => [sampleConnection({ id: "2", name: "Broken Kafka" })],
      connection_check_status: () => "UNREACHABLE",
    });
    renderWithClient(<ConnectionTree />);

    await screen.findByText("Broken Kafka");
    await waitFor(() => {
      expect(screen.getByTestId("status-2").className).toContain("status-dot--red");
    });
  });
});
