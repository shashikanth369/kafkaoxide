import { useState } from "react";
import { api } from "../lib/tauri";

export interface JsonTreeViewProps {
  value: unknown;
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="5.5" y="5.5" width="9" height="9" rx="1.5" stroke="currentColor" />
      <path d="M3.5 10.5h-1a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v1" stroke="currentColor" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6.5 3.5h-3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-3" stroke="currentColor" />
      <path d="M9.5 2.5h4v4M13.3 2.7L7.5 8.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type JsonRecord = Record<string, unknown>;

function isExpandable(value: unknown): value is unknown[] | JsonRecord {
  return value !== null && typeof value === "object";
}

function formatPrimitive(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return `"${value}"`;
  return String(value);
}

function primitiveTypeClass(value: unknown): string {
  if (value === null) return "json-tree-value--null";
  return `json-tree-value--${typeof value}`;
}

interface JsonNodeProps {
  label: string | null;
  value: unknown;
  depth: number;
}

function JsonNode({ label, value, depth }: JsonNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const indent = { paddingLeft: `${depth * 14}px` };

  if (!isExpandable(value)) {
    return (
      <div className="json-tree-line" style={indent}>
        <span className="json-tree-indent" aria-hidden="true" />
        {label !== null && <span className="json-tree-key">{label}: </span>}
        <span className={`json-tree-value ${primitiveTypeClass(value)}`}>{formatPrimitive(value)}</span>
      </div>
    );
  }

  const isArray = Array.isArray(value);
  const entries: [string, unknown][] = isArray
    ? value.map((item, index) => [String(index), item])
    : Object.entries(value);
  const openBracket = isArray ? "[" : "{";
  const closeBracket = isArray ? "]" : "}";

  return (
    <div>
      <div className="json-tree-line" style={indent}>
        <button
          type="button"
          className={`tree-caret-button${expanded ? " tree-caret-button--expanded" : ""}`}
          aria-label={expanded ? `Collapse ${label ?? "value"}` : `Expand ${label ?? "value"}`}
          onClick={() => setExpanded((current) => !current)}
        >
          <span className="tree-caret" aria-hidden="true" />
        </button>
        {label !== null && <span className="json-tree-key">{label}: </span>}
        <span className="json-tree-bracket">{openBracket}</span>
        {!expanded && (
          <>
            <span className="json-tree-summary">
              {entries.length} {isArray ? "items" : "keys"}
            </span>
            <span className="json-tree-bracket">{closeBracket}</span>
          </>
        )}
      </div>
      {expanded && (
        <>
          {entries.map(([key, item]) => (
            <JsonNode key={key} label={key} value={item} depth={depth + 1} />
          ))}
          <div className="json-tree-line" style={indent}>
            <span className="json-tree-indent" aria-hidden="true" />
            <span className="json-tree-bracket">{closeBracket}</span>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * A collapsible, syntax-highlighted JSON tree — every object/array node gets
 * an expand/collapse arrow. The toolbar has two icon buttons (label shown
 * on hover): copy the whole pretty-printed value to the clipboard, or open
 * it in a standalone viewer tab in the system browser.
 */
export function JsonTreeView({ value }: JsonTreeViewProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(JSON.stringify(value, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleOpenInNewTab() {
    void api.openJsonViewer(JSON.stringify(value, null, 2));
  }

  return (
    <div className="json-tree">
      <div className="json-tree-toolbar">
        <button
          type="button"
          className="json-tree-icon-button"
          title="Open in new tab"
          aria-label="Open in new tab"
          onClick={handleOpenInNewTab}
        >
          <ExternalLinkIcon />
        </button>
        <button
          type="button"
          className="json-tree-icon-button"
          title={copied ? "Copied!" : "Copy"}
          aria-label={copied ? "Copied!" : "Copy"}
          onClick={handleCopy}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
      </div>
      <div className="json-tree-body" role="tree">
        <JsonNode label={null} value={value} depth={0} />
      </div>
    </div>
  );
}
