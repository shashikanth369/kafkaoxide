import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../../lib/tauri";

/** Backs the tree's "Brokers" sub-list — fetched lazily, only once the category is expanded. */
export function useBrokers(connectionId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["brokers", connectionId],
    queryFn: () => api.listBrokers(connectionId),
    enabled,
  });
}

/** Backs the tree's "Topics" sub-list — fetched lazily, only once the category is expanded. */
export function useTopics(connectionId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["topics", connectionId],
    queryFn: () => api.listTopics(connectionId),
    enabled,
  });
}

/** Backs the tree's "Consumers" sub-list — fetched lazily, only once the category is expanded. */
export function useConsumerGroups(connectionId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["consumer-groups", connectionId],
    queryFn: () => api.listConsumerGroups(connectionId),
    enabled,
  });
}

/** Backs the topic detail panel's Properties > Messages "Refresh" button. */
export function useCountTopicMessages() {
  return useMutation<number, Error, { connectionId: string; topic: string }>({
    mutationFn: ({ connectionId, topic }) => api.countTopicMessages(connectionId, topic),
  });
}
