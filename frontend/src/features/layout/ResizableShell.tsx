import { ReactNode } from "react";
import { useResizablePanes } from "./useResizablePanes";

export interface ResizableShellProps {
  left: ReactNode;
  middle: ReactNode;
  right?: ReactNode;
  /** Overridable for tests; defaults to a single shared app-wide layout. */
  storageKey?: string;
}

export function ResizableShell({ left, middle, right, storageKey = "kafkaoxide.pane-widths" }: ResizableShellProps) {
  const { leftWidth, rightWidth, startResizingLeft, startResizingRight } = useResizablePanes({ storageKey });

  return (
    <div className="resizable-shell">
      <div className="resizable-pane resizable-pane--left" data-testid="resizable-pane-left" style={{ width: leftWidth }}>
        {left}
      </div>
      <div
        className="resizable-divider"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize left panel"
        onPointerDown={startResizingLeft}
      />
      <div className="resizable-pane resizable-pane--middle" data-testid="resizable-pane-middle">
        {middle}
      </div>
      <div
        className="resizable-divider"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize right panel"
        onPointerDown={startResizingRight}
      />
      <div
        className="resizable-pane resizable-pane--right"
        data-testid="resizable-pane-right"
        style={{ width: rightWidth }}
      >
        {right ?? <p className="resizable-pane-placeholder">Select a message to view its payload.</p>}
      </div>
    </div>
  );
}
