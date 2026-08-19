import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JsonViewerTabPanel } from "./JsonViewerTabPanel";
import { useJsonViewerTabsStore } from "./useJsonViewerTabsStore";
import { useTabsStore } from "./useTabsStore";

beforeEach(() => {
  useJsonViewerTabsStore.setState({ tabs: [] });
  useTabsStore.setState({ tabs: [], activeTabId: null, error: null });
});

describe("JsonViewerTabPanel", () => {
  it("shows the tab's title and the JSON tree for its value", () => {
    render(<JsonViewerTabPanel tab={{ id: "json-1", title: "Partition 0 · Offset 1", value: { orderId: 1 } }} />);

    expect(screen.getByRole("heading", { name: "Partition 0 · Offset 1" })).toBeInTheDocument();
    expect(screen.getByText("orderId:")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("opens another JSON tab and activates it when 'Open in new tab' is clicked", async () => {
    const user = userEvent.setup();
    render(<JsonViewerTabPanel tab={{ id: "json-1", title: "Partition 0 · Offset 1", value: { a: 1 } }} />);

    await user.click(screen.getByRole("button", { name: "Open in new tab" }));

    const tabs = useJsonViewerTabsStore.getState().tabs;
    expect(tabs).toHaveLength(1);
    expect(tabs[0].title).toBe("Partition 0 · Offset 1");
    expect(useTabsStore.getState().activeTabId).toBe(tabs[0].id);
  });
});
