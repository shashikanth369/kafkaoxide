import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { JsonViewerTabPanel } from "./JsonViewerTabPanel";

describe("JsonViewerTabPanel", () => {
  it("shows the tab's title and the JSON tree for its value", () => {
    render(<JsonViewerTabPanel tab={{ id: "json-1", title: "Partition 0 · Offset 1", value: { orderId: 1 } }} />);

    expect(screen.getByRole("heading", { name: "Partition 0 · Offset 1" })).toBeInTheDocument();
    expect(screen.getByText("orderId:")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("doesn't show an 'Open in new tab' button — this view is already a dedicated tab for the value", () => {
    render(<JsonViewerTabPanel tab={{ id: "json-1", title: "Partition 0 · Offset 1", value: { a: 1 } }} />);

    expect(screen.queryByRole("button", { name: "Open in new tab" })).not.toBeInTheDocument();
  });
});
