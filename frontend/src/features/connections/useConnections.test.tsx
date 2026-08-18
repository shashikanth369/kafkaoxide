import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { setInvokeHandlers } from "../../lib/testInvoke";
import { useConnect, useConnectionConnected, useDisconnect, useUpdateConnection } from "./useConnections";
import { sampleNewConnection } from "./connectionTestFixtures";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

const newConnection = sampleNewConnection();

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useUpdateConnection", () => {
  it("calls connection_update with the id and updated fields", async () => {
    const updated = { id: "1", ...newConnection, createdAt: "now", updatedAt: "now" };
    const connectionUpdate = vi.fn(() => updated);
    setInvokeHandlers({ connection_update: connectionUpdate });

    const { result } = renderHook(() => useUpdateConnection(), { wrapper: createWrapper() });

    result.current.mutate({ id: "1", connection: newConnection });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(connectionUpdate).toHaveBeenCalledWith({ id: "1", newConnection });
  });
});

describe("useConnectionConnected", () => {
  it("reflects the connection_is_connected result", async () => {
    setInvokeHandlers({ connection_is_connected: () => true });

    const { result } = renderHook(() => useConnectionConnected("1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toBe(true));
  });

  it("defaults to false before the query resolves", () => {
    setInvokeHandlers({ connection_is_connected: () => true });
    const { result } = renderHook(() => useConnectionConnected("1"), { wrapper: createWrapper() });
    expect(result.current.data).toBe(false);
  });
});

describe("useConnect", () => {
  it("calls connection_connect with the id and returns the resulting status", async () => {
    const connectionConnect = vi.fn(() => "REACHABLE");
    setInvokeHandlers({ connection_connect: connectionConnect });

    const { result } = renderHook(() => useConnect(), { wrapper: createWrapper() });
    result.current.mutate("1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(connectionConnect).toHaveBeenCalledWith({ id: "1" });
    expect(result.current.data).toBe("REACHABLE");
  });
});

describe("useDisconnect", () => {
  it("calls connection_disconnect with the id", async () => {
    const connectionDisconnect = vi.fn(() => undefined);
    setInvokeHandlers({ connection_disconnect: connectionDisconnect });

    const { result } = renderHook(() => useDisconnect(), { wrapper: createWrapper() });
    result.current.mutate("1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(connectionDisconnect).toHaveBeenCalledWith({ id: "1" });
  });
});
