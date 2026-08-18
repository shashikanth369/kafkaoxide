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
      message: { partition: 0, offset: 1, timestampMs: null, key: null, payloadBase64: btoa("hello world") },
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
      },
    });
    const user = userEvent.setup();
    render(<MessagePayloadViewer />);

    await user.click(screen.getByRole("button", { name: "JSON" }));

    expect(screen.getByText(/"id": 1/)).toBeInTheDocument();
  });

  it("shows an error message when JSON is requested but the payload isn't valid JSON", async () => {
    useMessageViewerStore.setState({
      message: { partition: 0, offset: 1, timestampMs: null, key: null, payloadBase64: btoa("not json") },
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
      message: { partition: 0, offset: 1, timestampMs: null, key: null, payloadBase64 },
    });
    render(<MessagePayloadViewer />);

    expect(screen.getByText(/avro/i)).toBeInTheDocument();
    expect(screen.getByText(/schema id: 42/i)).toBeInTheDocument();
  });

  it("shows a hint to enable 'Load message payload' when payloadBase64 is null", () => {
    useMessageViewerStore.setState({
      message: { partition: 0, offset: 1, timestampMs: null, key: null, payloadBase64: null },
    });
    render(<MessagePayloadViewer />);

    expect(screen.getByText(/load message payload/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Text" })).not.toBeInTheDocument();
  });

  it("shows the message's partition and offset even when the payload wasn't loaded", () => {
    useMessageViewerStore.setState({
      message: { partition: 3, offset: 17, timestampMs: null, key: null, payloadBase64: null },
    });
    render(<MessagePayloadViewer />);

    expect(screen.getByText(/partition 3/i)).toBeInTheDocument();
    expect(screen.getByText(/offset 17/i)).toBeInTheDocument();
  });

  it("shows the message's partition and offset", () => {
    useMessageViewerStore.setState({
      message: { partition: 3, offset: 17, timestampMs: null, key: null, payloadBase64: btoa("x") },
    });
    render(<MessagePayloadViewer />);

    expect(screen.getByText(/partition 3/i)).toBeInTheDocument();
    expect(screen.getByText(/offset 17/i)).toBeInTheDocument();
  });
});
