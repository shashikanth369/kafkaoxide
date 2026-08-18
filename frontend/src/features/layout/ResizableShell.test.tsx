import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResizableShell } from "./ResizableShell";

beforeEach(() => {
  localStorage.clear();
});

describe("ResizableShell", () => {
  it("renders the left, middle, and right content", () => {
    render(
      <ResizableShell
        storageKey="test-shell-1"
        left={<div>Left content</div>}
        middle={<div>Middle content</div>}
        right={<div>Right content</div>}
      />,
    );

    expect(screen.getByText("Left content")).toBeInTheDocument();
    expect(screen.getByText("Middle content")).toBeInTheDocument();
    expect(screen.getByText("Right content")).toBeInTheDocument();
  });

  it("renders a resize handle between the left and middle panes", () => {
    render(
      <ResizableShell
        storageKey="test-shell-2"
        left={<div>Left</div>}
        middle={<div>Middle</div>}
        right={<div>Right</div>}
      />,
    );

    expect(screen.getByRole("separator", { name: "Resize left panel" })).toBeInTheDocument();
  });

  it("renders a resize handle between the middle and right panes", () => {
    render(
      <ResizableShell
        storageKey="test-shell-3"
        left={<div>Left</div>}
        middle={<div>Middle</div>}
        right={<div>Right</div>}
      />,
    );

    expect(screen.getByRole("separator", { name: "Resize right panel" })).toBeInTheDocument();
  });

  it("applies the persisted left and right widths as inline styles", () => {
    localStorage.setItem("test-shell-4", JSON.stringify({ left: 300, right: 280 }));

    render(
      <ResizableShell
        storageKey="test-shell-4"
        left={<div>Left</div>}
        middle={<div>Middle</div>}
        right={<div>Right</div>}
      />,
    );

    expect(screen.getByTestId("resizable-pane-left")).toHaveStyle({ width: "300px" });
    expect(screen.getByTestId("resizable-pane-right")).toHaveStyle({ width: "280px" });
  });

  it("keeps the right pane (and its resize handle) present with a placeholder when no content is given", () => {
    render(
      <ResizableShell storageKey="test-shell-5" left={<div>Left</div>} middle={<div>Middle</div>} />,
    );

    expect(screen.getByTestId("resizable-pane-right")).toBeInTheDocument();
    expect(screen.getByRole("separator", { name: "Resize right panel" })).toBeInTheDocument();
  });
});
