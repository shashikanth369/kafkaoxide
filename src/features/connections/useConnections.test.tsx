import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { setInvokeHandlers } from "../../lib/testInvoke";
import { useUpdateConnection } from "./useConnections";
import type { NewConnection } from "../../lib/tauri";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

const newConnection: NewConnection = {
  name: "Local Kafka",
  bootstrapServers: "localhost:9092",
  securityProtocol: "PLAINTEXT",
  saslMechanism: null,
  saslUsername: null,
  saslPassword: null,
};

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
