import { useEffect, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ColDef, ModuleRegistry, themeQuartz, ValueFormatterParams } from "ag-grid-community";
import { TopicMessage } from "../../lib/tauri";
import { useTabsStore } from "../tabs/useTabsStore";
import { useMessageViewerStore } from "../workspace/useMessageViewerStore";
import { dataTabCacheKey, EMPTY_TAB_MESSAGES, useTabDataStore } from "../workspace/useTabDataStore";
import { emptyFilterForm, FilterFormState, toMessageFilter } from "./dataFilters";
import { useFetchMessages } from "./useClusterResources";

ModuleRegistry.registerModules([AllCommunityModule]);

function formatTimestamp(params: ValueFormatterParams<TopicMessage, number | null>): string {
  return params.value ? new Date(params.value).toISOString() : "";
}

const COLUMN_DEFS: ColDef<TopicMessage>[] = [
  { field: "partition", headerName: "Partition" },
  { field: "offset", headerName: "Offset" },
  { field: "timestampMs", headerName: "Timestamp", valueFormatter: formatTimestamp },
  { field: "key", headerName: "Key" },
];

const DEFAULT_COL_DEF: ColDef<TopicMessage> = {
  sortable: true,
  filter: true,
  resizable: true,
};

export interface DataTabProps {
  connectionId: string;
  topicName: string;
  /** When set, this Data tab is scoped to a single partition — the Partition filter is prepopulated and locked to it. */
  partitionId?: number;
}

/**
 * Fetch pulls a bounded snapshot of message metadata applying the filters
 * below (an all-blank filter pulls everything). Stop doesn't cancel the
 * in-flight backend fetch (no cancellation plumbing there) — it just
 * discards the result when it eventually arrives, so the grid never
 * updates with data the user already asked to stop waiting for.
 */
export function DataTab({ connectionId, topicName, partitionId }: DataTabProps) {
  const [form, setForm] = useState<FilterFormState>(() =>
    partitionId === undefined ? emptyFilterForm() : { ...emptyFilterForm(), partitions: String(partitionId) },
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const fetchMessages = useFetchMessages();
  const viewMessage = useMessageViewerStore((s) => s.viewMessage);
  const stoppedRef = useRef(false);
  const activeTabId = useTabsStore((s) => s.activeTabId);
  const tabKey = dataTabCacheKey(activeTabId, connectionId, topicName, partitionId);
  const messages = useTabDataStore((s) => s.messagesByTab[tabKey] ?? EMPTY_TAB_MESSAGES);
  const setTabMessages = useTabDataStore((s) => s.setTabMessages);

  // DataTab is reused (not remounted) when switching between partitions of
  // the same topic within the same top-level tab — see PartitionDetailPanel,
  // which doesn't key it by partitionId so the active tab (Properties/Data/
  // Replicas) survives the switch. The initial useState above only runs
  // once on mount, so without this the Partition filter would keep showing
  // whichever partition was selected first.
  useEffect(() => {
    if (partitionId !== undefined) {
      setForm((prev) => ({ ...prev, partitions: String(partitionId) }));
    }
  }, [partitionId]);

  function updateForm(patch: Partial<FilterFormState>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  async function handlePlay() {
    setError(null);
    setIsPlaying(true);
    stoppedRef.current = false;
    try {
      const result = await fetchMessages.mutateAsync({
        connectionId,
        topic: topicName,
        filter: toMessageFilter(form),
      });
      if (!stoppedRef.current) {
        setTabMessages(tabKey, result);
      }
    } catch (err) {
      if (!stoppedRef.current) {
        setError(err instanceof Error ? err.message : "Failed to fetch messages");
      }
    } finally {
      setIsPlaying(false);
    }
  }

  function handleStop() {
    stoppedRef.current = true;
    setIsPlaying(false);
  }

  return (
    <div className="data-tab">
      <div className="data-tab-filters">
        <label>
          Max messages per partition
          <input
            inputMode="numeric"
            value={form.maxMessagesPerPartition}
            onChange={(e) => updateForm({ maxMessagesPerPartition: e.target.value })}
          />
        </label>
        <label>
          Total max messages
          <input
            inputMode="numeric"
            value={form.maxTotalMessages}
            onChange={(e) => updateForm({ maxTotalMessages: e.target.value })}
          />
        </label>
        <label>
          Partition filter
          <input
            value={form.partitions}
            onChange={(e) => updateForm({ partitions: e.target.value })}
            placeholder="e.g. 0, 1, 2"
            disabled={partitionId !== undefined}
          />
        </label>
        <label>
          From
          <input
            type="datetime-local"
            value={form.fromDate}
            onChange={(e) => updateForm({ fromDate: e.target.value })}
          />
        </label>
        <label>
          To
          <input type="datetime-local" value={form.toDate} onChange={(e) => updateForm({ toDate: e.target.value })} />
        </label>
        <label>
          Offset
          <input
            inputMode="numeric"
            value={form.offset}
            onChange={(e) => updateForm({ offset: e.target.value })}
            placeholder="e.g. 100"
          />
        </label>
      </div>

      <div className="data-tab-controls">
        <button type="button" aria-label="Fetch" onClick={handlePlay} disabled={isPlaying}>
          ▶ Fetch
        </button>
        <button type="button" aria-label="Stop" onClick={handleStop} disabled={!isPlaying}>
          ■ Stop
        </button>
      </div>
      <label className="connection-modal-checkbox-label data-tab-include-payload">
        <input
          type="checkbox"
          checked={form.includePayload}
          onChange={(e) => updateForm({ includePayload: e.target.checked })}
        />
        Load message payload
      </label>

      {error && (
        <p role="alert" className="connection-modal-error">
          {error}
        </p>
      )}

      <label className="data-tab-search">
        Search messages
        <input
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search…"
        />
      </label>

      <div className="data-tab-grid" data-testid="message-grid">
        <AgGridReact<TopicMessage>
          theme={themeQuartz}
          rowData={messages}
          columnDefs={COLUMN_DEFS}
          defaultColDef={DEFAULT_COL_DEF}
          quickFilterText={searchText}
          onRowClicked={(event) => {
            if (event.data) viewMessage(event.data);
          }}
        />
      </div>
    </div>
  );
}
