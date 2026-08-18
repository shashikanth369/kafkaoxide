import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ConnectionStatus, NewConnection } from "../../lib/tauri";

export function useConnectionsQuery() {
  return useQuery({ queryKey: ["connections"], queryFn: api.listConnections });
}

export function useCreateConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newConnection: NewConnection) => api.createConnection(newConnection),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["connections"] }),
  });
}

export function useUpdateConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, connection }: { id: string; connection: NewConnection }) =>
      api.updateConnection(id, connection),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["connections"] }),
  });
}

export function useDeleteConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteConnection(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["connections"] }),
  });
}

export function useConnectionStatus(id: string) {
  return useQuery({
    queryKey: ["connection-status", id],
    queryFn: () => api.checkConnectionStatus(id),
    refetchInterval: 10_000,
    initialData: "UNKNOWN" as const,
  });
}

/** Backs the ping button next to "Bootstrap servers" in the New Connection modal. */
export function usePingBootstrapServers() {
  return useMutation<ConnectionStatus, Error, string>({
    mutationFn: (bootstrapServers: string) => api.pingBootstrapServers(bootstrapServers),
  });
}

/** Backs the ping button next to "Host" in the New Connection modal's Zookeeper section. */
export function usePingZookeeper() {
  return useMutation<ConnectionStatus, Error, { host: string; port: number }>({
    mutationFn: ({ host, port }) => api.pingZookeeper(host, port),
  });
}

/** Backs the New Connection modal's bottom "Test" button. */
export function useTestConnection() {
  return useMutation<ConnectionStatus, Error, NewConnection>({
    mutationFn: (newConnection: NewConnection) => api.testConnection(newConnection),
  });
}
