import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConnectionForm } from "./ConnectionForm";

describe("ConnectionForm", () => {
  it("submits a plaintext connection without SASL fields", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ConnectionForm onSubmit={onSubmit} submitLabel="Save" />);

    await user.type(screen.getByLabelText("Name"), "Local Kafka");
    await user.type(screen.getByLabelText("Bootstrap servers"), "localhost:9092");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Local Kafka",
      bootstrapServers: "localhost:9092",
      securityProtocol: "PLAINTEXT",
      saslMechanism: null,
      saslUsername: null,
      saslPassword: null,
    });
  });

  it("shows validation error when name is missing", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ConnectionForm onSubmit={onSubmit} submitLabel="Save" />);

    await user.type(screen.getByLabelText("Bootstrap servers"), "localhost:9092");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Name is required");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("requires a SASL mechanism when SASL_SSL is selected", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ConnectionForm onSubmit={onSubmit} submitLabel="Save" />);

    await user.type(screen.getByLabelText("Name"), "Secure Kafka");
    await user.type(screen.getByLabelText("Bootstrap servers"), "broker:9093");
    await user.selectOptions(screen.getByLabelText("Security protocol"), "SASL_SSL");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("alert")).toHaveTextContent("SASL mechanism is required");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits full SASL details when provided", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ConnectionForm onSubmit={onSubmit} submitLabel="Save" />);

    await user.type(screen.getByLabelText("Name"), "Secure Kafka");
    await user.type(screen.getByLabelText("Bootstrap servers"), "broker:9093");
    await user.selectOptions(screen.getByLabelText("Security protocol"), "SASL_SSL");
    await user.selectOptions(screen.getByLabelText("SASL mechanism"), "SCRAM-SHA-512");
    await user.type(screen.getByLabelText("Username"), "alice");
    await user.type(screen.getByLabelText("Password"), "hunter2");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Secure Kafka",
      bootstrapServers: "broker:9093",
      securityProtocol: "SASL_SSL",
      saslMechanism: "SCRAM-SHA-512",
      saslUsername: "alice",
      saslPassword: "hunter2",
    });
  });

  it("disables the submit button while the submission is pending", async () => {
    let resolveSubmit!: () => void;
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        }),
    );
    const user = userEvent.setup();
    render(<ConnectionForm onSubmit={onSubmit} submitLabel="Save" />);

    await user.type(screen.getByLabelText("Name"), "Local Kafka");
    await user.type(screen.getByLabelText("Bootstrap servers"), "localhost:9092");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(onSubmit).toHaveBeenCalledTimes(1);

    resolveSubmit();
    await waitFor(() => expect(screen.getByRole("button", { name: "Save" })).not.toBeDisabled());
  });

  it("shows an error alert and re-enables the button when onSubmit rejects", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("Failed to create connection"));
    const user = userEvent.setup();
    render(<ConnectionForm onSubmit={onSubmit} submitLabel="Save" />);

    await user.type(screen.getByLabelText("Name"), "Local Kafka");
    await user.type(screen.getByLabelText("Bootstrap servers"), "localhost:9092");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to create connection");
    expect(screen.getByRole("button", { name: "Save" })).not.toBeDisabled();
  });

  it("clears the SASL password after a successful submit", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ConnectionForm onSubmit={onSubmit} submitLabel="Save" />);

    await user.type(screen.getByLabelText("Name"), "Secure Kafka");
    await user.type(screen.getByLabelText("Bootstrap servers"), "broker:9093");
    await user.selectOptions(screen.getByLabelText("Security protocol"), "SASL_SSL");
    await user.selectOptions(screen.getByLabelText("SASL mechanism"), "SCRAM-SHA-512");
    await user.type(screen.getByLabelText("Username"), "alice");
    await user.type(screen.getByLabelText("Password"), "hunter2");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText("Password")).toHaveValue("");
  });
});
