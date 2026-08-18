import { useState } from "react";
import { BrokerSummary, ConsumerGroupSummary, TopicSummary } from "../../lib/tauri";
import { useWorkspaceSelectionStore } from "../workspace/useWorkspaceSelectionStore";
import { ResourceCategory } from "./ResourceCategory";
import { useBrokers, useConsumerGroups, useTopics } from "./useClusterResources";

export interface ClusterResourceTreeProps {
  connectionId: string;
}

/**
 * The three lazily-loaded, searchable sub-lists shown once a cluster is
 * connected and its tree row is expanded.
 */
export function ClusterResourceTree({ connectionId }: ClusterResourceTreeProps) {
  const [brokersRequested, setBrokersRequested] = useState(false);
  const [topicsRequested, setTopicsRequested] = useState(false);
  const [groupsRequested, setGroupsRequested] = useState(false);

  const brokers = useBrokers(connectionId, brokersRequested);
  const topics = useTopics(connectionId, topicsRequested);
  const groups = useConsumerGroups(connectionId, groupsRequested);

  const selection = useWorkspaceSelectionStore((s) => s.selection);
  const selectBroker = useWorkspaceSelectionStore((s) => s.selectBroker);
  const selectTopic = useWorkspaceSelectionStore((s) => s.selectTopic);
  const selectConsumerGroup = useWorkspaceSelectionStore((s) => s.selectConsumerGroup);

  return (
    <ul className="resource-tree" data-testid={`resource-tree-${connectionId}`}>
      <ResourceCategory<BrokerSummary>
        label="Brokers"
        items={brokers.data}
        isLoading={brokers.isLoading}
        onExpand={() => setBrokersRequested(true)}
        getKey={(broker) => String(broker.id)}
        getLabel={(broker) => `${broker.id} — ${broker.host}:${broker.port}`}
        matchesSearch={(broker, query) =>
          `${broker.id} ${broker.host}`.toLowerCase().includes(query.toLowerCase())
        }
        isSelected={(broker) =>
          selection?.type === "broker" &&
          selection.connectionId === connectionId &&
          selection.brokerId === broker.id
        }
        onSelect={(broker) => selectBroker(connectionId, broker.id)}
      />
      <ResourceCategory<TopicSummary>
        label="Topics"
        items={topics.data}
        isLoading={topics.isLoading}
        onExpand={() => setTopicsRequested(true)}
        getKey={(topic) => topic.name}
        getLabel={(topic) => topic.name}
        matchesSearch={(topic, query) => topic.name.toLowerCase().includes(query.toLowerCase())}
        isSelected={(topic) =>
          selection?.type === "topic" &&
          selection.connectionId === connectionId &&
          selection.topicName === topic.name
        }
        onSelect={(topic) => selectTopic(connectionId, topic.name)}
      />
      <ResourceCategory<ConsumerGroupSummary>
        label="Consumers"
        items={groups.data}
        isLoading={groups.isLoading}
        onExpand={() => setGroupsRequested(true)}
        getKey={(group) => group.groupId}
        getLabel={(group) => group.groupId}
        matchesSearch={(group, query) => group.groupId.toLowerCase().includes(query.toLowerCase())}
        isSelected={(group) =>
          selection?.type === "consumerGroup" &&
          selection.connectionId === connectionId &&
          selection.groupId === group.groupId
        }
        onSelect={(group) => selectConsumerGroup(connectionId, group.groupId)}
      />
    </ul>
  );
}
