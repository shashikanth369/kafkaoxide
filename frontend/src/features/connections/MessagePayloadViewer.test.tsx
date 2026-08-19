import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useMessageViewerStore } from "../workspace/useMessageViewerStore";
import { MessagePayloadViewer } from "./MessagePayloadViewer";

beforeEach(() => {
  useMessageViewerStore.setState({ message: null });
});

describe("MessagePayloadViewer", () => {
  it("shows a placeholder when no message is selected", () => {
    render(<MessagePayloadViewer />);
    expect(screen.getByText(/select a message/i)).toBeInTheDocument();
  });

  it("shows the payload as text by default", () => {
    useMessageViewerStore.setState({
      message: { partition: 0, offset: 1, timestampMs: null, key: null, payloadBase64: btoa("hello world"), headers: [] },
    });
    render(<MessagePayloadViewer />);

    expect(screen.getByText("hello world")).toBeInTheDocument();
  });

  it("pretty-prints the payload as JSON when the JSON toggle is clicked", async () => {
    useMessageViewerStore.setState({
      message: {
        partition: 0,
        offset: 1,
        timestampMs: null,
        key: null,
        payloadBase64: btoa('{"id":1,"name":"orders"}'),
        headers: [],
      },
    });
    const user = userEvent.setup();
    render(<MessagePayloadViewer />);

    await user.click(screen.getByRole("button", { name: "JSON" }));

    expect(screen.getByText("id:")).toBeInTheDocument();
    expect(screen.getByText('"orders"')).toBeInTheDocument();
  });

  it("shows an error message when JSON is requested but the payload isn't valid JSON", async () => {
    useMessageViewerStore.setState({
      message: { partition: 0, offset: 1, timestampMs: null, key: null, payloadBase64: btoa("not json"), headers: [] },
    });
    const user = userEvent.setup();
    render(<MessagePayloadViewer />);

    await user.click(screen.getByRole("button", { name: "JSON" }));

    expect(screen.getByText(/not valid json/i)).toBeInTheDocument();
  });

  it("shows an Avro banner with the schema id for Confluent-wire-format payloads", () => {
    const bytes = [0x00, 0x00, 0x00, 0x00, 0x2a, 0x01, 0x02];
    const payloadBase64 = btoa(String.fromCharCode(...bytes));
    useMessageViewerStore.setState({
      message: { partition: 0, offset: 1, timestampMs: null, key: null, payloadBase64, headers: [] },
    });
    render(<MessagePayloadViewer />);

    expect(screen.getByText(/avro/i)).toBeInTheDocument();
    expect(screen.getByText(/schema id: 42/i)).toBeInTheDocument();
  });

  it("shows a hint to enable 'Load message payload' when payloadBase64 is null", () => {
    useMessageViewerStore.setState({
      message: { partition: 0, offset: 1, timestampMs: null, key: null, payloadBase64: null, headers: [] },
    });
    render(<MessagePayloadViewer />);

    expect(screen.getByText(/load message payload/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Text" })).not.toBeInTheDocument();
  });

  it("shows the message's partition and offset even when the payload wasn't loaded", () => {
    useMessageViewerStore.setState({
      message: { partition: 3, offset: 17, timestampMs: null, key: null, payloadBase64: null, headers: [] },
    });
    render(<MessagePayloadViewer />);

    expect(screen.getByText(/partition 3/i)).toBeInTheDocument();
    expect(screen.getByText(/offset 17/i)).toBeInTheDocument();
  });

  it("shows the message's partition and offset", () => {
    useMessageViewerStore.setState({
      message: { partition: 3, offset: 17, timestampMs: null, key: null, payloadBase64: btoa("x"), headers: [] },
    });
    render(<MessagePayloadViewer />);

    expect(screen.getByText(/partition 3/i)).toBeInTheDocument();
    expect(screen.getByText(/offset 17/i)).toBeInTheDocument();
  });

  it("opens on the Value tab by default", () => {
    useMessageViewerStore.setState({
      message: { partition: 0, offset: 1, timestampMs: null, key: null, payloadBase64: null, headers: [] },
    });
    render(<MessagePayloadViewer />);

    expect(screen.getByRole("tab", { name: "Value" })).toHaveAttribute("aria-selected", "true");
  });

  it("shows a table of headers on the Headers tab", async () => {
    useMessageViewerStore.setState({
      message: {
        partition: 0,
        offset: 1,
        timestampMs: null,
        key: null,
        payloadBase64: null,
        headers: [
          { key: "content-type", value: "application/json" },
          { key: "empty-header", value: null },
        ],
      },
    });
    const user = userEvent.setup();
    render(<MessagePayloadViewer />);

    await user.click(screen.getByRole("tab", { name: "Headers" }));

    expect(screen.getByText("content-type")).toBeInTheDocument();
    expect(screen.getByText("application/json")).toBeInTheDocument();
    expect(screen.getByText("empty-header")).toBeInTheDocument();
  });

  it("shows a placeholder on the Headers tab when the message has no headers", async () => {
    useMessageViewerStore.setState({
      message: { partition: 0, offset: 1, timestampMs: null, key: null, payloadBase64: null, headers: [] },
    });
    const user = userEvent.setup();
    render(<MessagePayloadViewer />);

    await user.click(screen.getByRole("tab", { name: "Headers" }));

    expect(screen.getByText(/no headers/i)).toBeInTheDocument();
  });

  it("shows headers even when the payload wasn't loaded for this fetch", async () => {
    useMessageViewerStore.setState({
      message: {
        partition: 0,
        offset: 1,
        timestampMs: null,
        key: null,
        payloadBase64: null,
        headers: [{ key: "trace-id", value: "abc" }],
      },
    });
    const user = userEvent.setup();
    render(<MessagePayloadViewer />);

    await user.click(screen.getByRole("tab", { name: "Headers" }));

    expect(screen.getByText("trace-id")).toBeInTheDocument();
  });
});
