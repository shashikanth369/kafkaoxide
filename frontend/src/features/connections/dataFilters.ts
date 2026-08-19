import { MessageFilter } from "../../lib/tauri";

/** Editable form state for the topic Data tab's filter inputs. */
export interface FilterFormState {
  maxMessagesPerPartition: string;
  maxTotalMessages: string;
  /** Comma-separated partition ids, e.g. "0, 2, 5". */
  partitions: string;
  /** `<input type="datetime-local">` value. */
  fromDate: string;
  toDate: string;
  /** An explicit starting offset — takes priority over fromDate on the backend when both are set. */
  offset: string;
  /** The "Load message payload" checkbox below Play. */
  includePayload: boolean;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Formats a Date as a local `<input type="datetime-local">` value (`YYYY-MM-DDTHH:mm`). */
function toDatetimeLocal(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Today at the given local hour, minutes/seconds zeroed. */
function todayAt(hours: number): string {
  const date = new Date();
  date.setHours(hours, 0, 0, 0);
  return toDatetimeLocal(date);
}

/** The Data tab's default filter form — used both on first mount and whenever the reused tab switches to a different topic/partition/connection. From/To default to today's 12 AM–12 PM so a fresh Fetch is scoped to "today" rather than the whole topic. */
export function defaultFilterForm(): FilterFormState {
  return {
    maxMessagesPerPartition: "",
    maxTotalMessages: "",
    partitions: "",
    fromDate: todayAt(0),
    toDate: todayAt(12),
    offset: "",
    includePayload: false,
  };
}

function parsePositiveInt(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePartitions(value: string): number[] | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const parsed = trimmed
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isFinite(n));
  return parsed.length > 0 ? parsed : null;
}

function parseDate(value: string): number | null {
  if (value.trim().length === 0) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/** Converts the filter form into the wire-format MessageFilter — an all-blank form becomes an all-null filter (pull everything). */
export function toMessageFilter(form: FilterFormState): MessageFilter {
  return {
    partitions: parsePartitions(form.partitions),
    maxMessagesPerPartition: parsePositiveInt(form.maxMessagesPerPartition),
    maxTotalMessages: parsePositiveInt(form.maxTotalMessages),
    fromTimestampMs: parseDate(form.fromDate),
    toTimestampMs: parseDate(form.toDate),
    offset: parsePositiveInt(form.offset),
    includePayload: form.includePayload,
  };
}
