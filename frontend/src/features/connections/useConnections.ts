import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, NewConnection } from "../../lib/tauri";

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
