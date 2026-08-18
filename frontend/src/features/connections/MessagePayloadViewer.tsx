import { useState } from "react";
import { useMessageViewerStore } from "../workspace/useMessageViewerStore";
import { base64ToBytes, bytesToText, detectConfluentAvro, tryFormatJson } from "./payloadDecoding";

type ViewMode = "text" | "json";

export function MessagePayloadViewer() {
  const message = useMessageViewerStore((s) => s.message);
  const [mode, setMode] = useState<ViewMode>("text");

  if (!message) {
    return <p className="resizable-pane-placeholder">Select a message to view its payload.</p>;
  }

  const bytes = base64ToBytes(message.payloadBase64);
  const text = bytesToText(bytes);
  const avro = detectConfluentAvro(bytes);
  const json = mode === "json" ? tryFormatJson(text) : null;

  return (
    <div className="message-payload-viewer">
      <p className="message-payload-meta">
        Partition {message.partition} · Offset {message.offset}
        {message.key !== null && <> · Key: {message.key}</>}
      </p>
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
        (json !== null ? (
          <pre className="message-payload-body">{json}</pre>
        ) : (
          <p role="alert">Payload is not valid JSON.</p>
        ))}
    </div>
  );
}
