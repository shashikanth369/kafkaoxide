import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setInvokeHandlers } from "../../lib/testInvoke";
import { useMessageViewerStore } from "../workspace/useMessageViewerStore";
import { useTabDataStore } from "../workspace/useTabDataStore";
import { DataTab } from "./DataTab";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

// Real AG Grid needs DOM measurement (ResizeObserver etc.) jsdom doesn't
// fully provide; this test's job is to verify DataTab passes the right
// rowData/onRowClicked, not to exercise AG Grid's own rendering.
let lastGridProps: {
  rowData: unknown[];
  onRowClicked: (event: { data: unknown }) => void;
  quickFilterText?: string;
} | null = null;
vi.mock("ag-grid-react", () => ({
  AgGridReact: (props: {
    rowData: unknown[];
    onRowClicked: (event: { data: unknown }) => void;
    quickFilterText?: string;
  }) => {
    lastGridProps = props;
    return null;
  },
}));

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

// Resetting via a helper (rather than a bare `lastGridProps = null` inline)
// avoids TypeScript narrowing lastGridProps to exactly `null` for the rest
// of the enclosing test body.
function resetLastGridProps() {
  lastGridProps = null;
}

beforeEach(() => {
  vi.clearAllMocks();
  resetLastGridProps();
  useMessageViewerStore.setState({ message: null });
  useTabDataStore.setState({ messagesByTab: {} });
});

describe("DataTab", () => {
  it("renders Play and Stop controls, and all six filter inputs", () => {
    renderWithClient(<DataTab connectionId="1" topicName="orders" />);

    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();
    expect(screen.getByLabelText("Max messages per partition")).toBeInTheDocument();
    expect(screen.getByLabelText("Total max messages")).toBeInTheDocument();
    expect(screen.getByLabelText("Partition filter")).toBeInTheDocument();
    expect(screen.getByLabelText("From")).toBeInTheDocument();
    expect(screen.getByLabelText("To")).toBeInTheDocument();
    expect(screen.getByLabelText("Offset")).toBeInTheDocument();
  });

  it("starts with Stop disabled, since nothing is playing yet", () => {
    renderWithClient(<DataTab connectionId="1" topicName="orders" />);
    expect(screen.getByRole("button", { name: "Stop" })).toBeDisabled();
  });

  it("shows a 'Load message payload' checkbox below Play/Stop, unchecked by default", () => {
    renderWithClient(<DataTab connectionId="1" topicName="orders" />);
    expect(screen.getByLabelText("Load message payload")).not.toBeChecked();
  });

  it("fetches messages with an all-null, no-payload filter when Play is clicked with no filters set", async () => {
    const fetchMessages = vi.fn(() => []);
    setInvokeHandlers({ connection_fetch_messages: fetchMessages });
    const user = userEvent.setup();
    renderWithClient(<DataTab connectionId="1" topicName="orders" />);

    await user.click(screen.getByRole("button", { name: "Play" }));

    await waitFor(() =>
      expect(fetchMessages).toHaveBeenCalledWith({
        id: "1",
        topic: "orders",
        filter: {
          partitions: null,
          maxMessagesPerPartition: null,
          maxTotalMessages: null,
          fromTimestampMs: null,
          toTimestampMs: null,
          offset: null,
          includePayload: false,
        },
      }),
    );
  });

  it("sets includePayload true when the checkbox is checked before Play is clicked", async () => {
    const fetchMessages = vi.fn(() => []);
    setInvokeHandlers({ connection_fetch_messages: fetchMessages });
    const user = userEvent.setup();
    renderWithClient(<DataTab connectionId="1" topicName="orders" />);

    await user.click(screen.getByLabelText("Load message payload"));
    await user.click(screen.getByRole("button", { name: "Play" }));

    await waitFor(() =>
      expect(fetchMessages).toHaveBeenCalledWith(
        expect.objectContaining({ filter: expect.objectContaining({ includePayload: true }) }),
      ),
    );
  });

  it("applies entered filters when Play is clicked", async () => {
    const fetchMessages = vi.fn(() => []);
    setInvokeHandlers({ connection_fetch_messages: fetchMessages });
    const user = userEvent.setup();
    renderWithClient(<DataTab connectionId="1" topicName="orders" />);

    await user.type(screen.getByLabelText("Max messages per partition"), "10");
    await user.type(screen.getByLabelText("Partition filter"), "0,1");
    await user.click(screen.getByRole("button", { name: "Play" }));

    await waitFor(() =>
      expect(fetchMessages).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({ maxMessagesPerPartition: 10, partitions: [0, 1] }),
        }),
      ),
    );
  });

  it("applies the offset filter when Play is clicked", async () => {
    const fetchMessages = vi.fn(() => []);
    setInvokeHandlers({ connection_fetch_messages: fetchMessages });
    const user = userEvent.setup();
    renderWithClient(<DataTab connectionId="1" topicName="orders" />);

    await user.type(screen.getByLabelText("Offset"), "100");
    await user.click(screen.getByRole("button", { name: "Play" }));

    await waitFor(() =>
      expect(fetchMessages).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({ offset: 100 }),
        }),
      ),
    );
  });

  it("passes the fetched messages to the grid as rowData", async () => {
    const messages = [{ partition: 0, offset: 1, timestampMs: null, key: null, payloadBase64: "eA==" }];
    setInvokeHandlers({ connection_fetch_messages: () => messages });
    const user = userEvent.setup();
    renderWithClient(<DataTab connectionId="1" topicName="orders" />);

    await user.click(screen.getByRole("button", { name: "Play" }));

    await waitFor(() => expect(lastGridProps?.rowData).toEqual(messages));
  });

  it("keeps the fetched messages cached for the tab across an unmount/remount (switching tabs away and back)", async () => {
    const messages = [{ partition: 0, offset: 1, timestampMs: null, key: null, payloadBase64: "eA==" }];
    setInvokeHandlers({ connection_fetch_messages: () => messages });
    const user = userEvent.setup();
    const { unmount } = renderWithClient(<DataTab connectionId="1" topicName="orders" />);

    await user.click(screen.getByRole("button", { name: "Play" }));
    await waitFor(() => expect(lastGridProps?.rowData).toEqual(messages));

    unmount();
    resetLastGridProps();
    renderWithClient(<DataTab connectionId="1" topicName="orders" />);

    expect(lastGridProps?.rowData).toEqual(messages);
  });

  it("shows an error when fetching fails", async () => {
    setInvokeHandlers({
      connection_fetch_messages: () => {
        throw new Error("Failed to fetch messages");
      },
    });
    const user = userEvent.setup();
    renderWithClient(<DataTab connectionId="1" topicName="orders" />);

    await user.click(screen.getByRole("button", { name: "Play" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to fetch messages");
  });

  it("shows a search input above the grid", () => {
    renderWithClient(<DataTab connectionId="1" topicName="orders" />);
    expect(screen.getByLabelText("Search messages")).toBeInTheDocument();
  });

  it("passes the search text to the grid as quickFilterText", async () => {
    const user = userEvent.setup();
    renderWithClient(<DataTab connectionId="1" topicName="orders" />);

    await user.type(screen.getByLabelText("Search messages"), "order-1");

    await waitFor(() => expect(lastGridProps?.quickFilterText).toBe("order-1"));
  });

  it("selects a message into the viewer store when a grid row is clicked", () => {
    renderWithClient(<DataTab connectionId="1" topicName="orders" />);
    const message = { partition: 0, offset: 5, timestampMs: null, key: null, payloadBase64: "eA==" };

    lastGridProps?.onRowClicked({ data: message });

    expect(useMessageViewerStore.getState().message).toEqual(message);
  });
});
