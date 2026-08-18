import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TopicDetailPanel } from "./TopicDetailPanel";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("TopicDetailPanel", () => {
  it("opens on the Properties tab by default, showing the topic name", () => {
    renderWithClient(<TopicDetailPanel connectionId="1" topicName="orders" />);

    expect(screen.getByRole("tab", { name: "Properties" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Topic name")).toHaveValue("orders");
  });

  it("renders Properties, Data, Partitions, and Config tabs", () => {
    renderWithClient(<TopicDetailPanel connectionId="1" topicName="orders" />);

    expect(screen.getByRole("tab", { name: "Properties" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Data" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Partitions" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Config" })).toBeInTheDocument();
  });

  it("switches to the Data tab when clicked", async () => {
    const user = userEvent.setup();
    renderWithClient(<TopicDetailPanel connectionId="1" topicName="orders" />);

    await user.click(screen.getByRole("tab", { name: "Data" }));

    expect(screen.getByRole("tab", { name: "Data" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByLabelText("Topic name")).not.toBeInTheDocument();
  });
});
