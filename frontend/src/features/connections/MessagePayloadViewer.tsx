import { useState } from "react";
import { JsonTreeView } from "../../components/JsonTreeView";
import { useMessageViewerStore } from "../workspace/useMessageViewerStore";
import { base64ToBytes, bytesToText, detectConfluentAvro, tryParseJson } from "./payloadDecoding";

type PanelTabId = "headers" | "value";
type ValueMode = "text" | "json";

const PANEL_TABS: { id: PanelTabId; label: string }[] = [
  { id: "headers", label: "Headers" },
  { id: "value", label: "Value" },
];

export function MessagePayloadViewer() {
  const message = useMessageViewerStore((s) => s.message);
  const [activeTab, setActiveTab] = useState<PanelTabId>("value");
  const [mode, setMode] = useState<ValueMode>("text");

  if (!message) {
    return <p className="resizable-pane-placeholder">Select a message to view its payload.</p>;
  }

  const bytes = message.payloadBase64 !== null ? base64ToBytes(message.payloadBase64) : null;
  const text = bytes !== null ? bytesToText(bytes) : null;
  const avro = bytes !== null ? detectConfluentAvro(bytes) : null;
  const json = mode === "json" && text !== null ? tryParseJson(text) : undefined;

  return (
    <div className="message-payload-viewer">
      <p className="message-payload-meta">
        Partition {message.partition} · Offset {message.offset}
        {message.key !== null && <> · Key: {message.key}</>}
      </p>

      <div className="connection-modal-tabs" role="tablist">
        {PANEL_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`connection-modal-tab${activeTab === tab.id ? " connection-modal-tab--active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "headers" && (
        <div role="tabpanel" aria-label="Headers">
          {message.headers.length === 0 ? (
            <p className="resizable-pane-placeholder">No headers.</p>
          ) : (
            <table className="topic-detail-table">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {message.headers.map((header, index) => (
                  <tr key={index}>
                    <td>{header.key}</td>
                    <td>{header.value ?? <em>null</em>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === "value" && (
        <div role="tabpanel" aria-label="Value">
          {text === null ? (
            <p className="resizable-pane-placeholder">
              Payload wasn't loaded for this fetch — check "Load message payload" below Play, then Play again.
            </p>
          ) : (
            <>
              {avro && (
                <p className="message-payload-avro-banner">
                  Avro (schema id: {avro.schemaId}) — schema registry decoding not implemented; showing raw bytes.
                </p>
              )}
              <div className="message-payload-toggle" role="group" aria-label="Payload view mode">
                <button
                  type="button"
                  className={mode === "text" ? "message-payload-toggle-button--active" : ""}
                  onClick={() => setMode("text")}
                >
                  Text
                </button>
                <button
                  type="button"
                  className={mode === "json" ? "message-payload-toggle-button--active" : ""}
                  onClick={() => setMode("json")}
                >
                  JSON
                </button>
              </div>
              {mode === "text" && <pre className="message-payload-body">{text}</pre>}
              {mode === "json" &&
                (json !== undefined ? (
                  <JsonTreeView value={json} />
                ) : (
                  <p role="alert">Payload is not valid JSON.</p>
                ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
