import { useState } from "react";

export interface JsonTreeViewProps {
  value: unknown;
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
 * an expand/collapse arrow, and a "Copy" button copies the whole
 * pretty-printed value to the clipboard.
 */
export function JsonTreeView({ value }: JsonTreeViewProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(JSON.stringify(value, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="json-tree">
      <div className="json-tree-toolbar">
        <button type="button" className="json-tree-copy-button" onClick={handleCopy}>
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <div className="json-tree-body" role="tree">
        <JsonNode label={null} value={value} depth={0} />
      </div>
    </div>
  );
}
