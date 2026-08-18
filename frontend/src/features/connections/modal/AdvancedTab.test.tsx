import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { emptyDraft } from "./draft";
import { AdvancedTab } from "./AdvancedTab";

describe("AdvancedTab", () => {
  it("renders the Advanced section's SASL mechanism and OAuth/OIDC URL inputs", () => {
    render(<AdvancedTab draft={emptyDraft()} onChange={vi.fn()} />);
    expect(screen.getByLabelText("SASL mechanism")).toBeInTheDocument();
    expect(screen.getByLabelText("SASL OAuth/OIDC identity provider URL")).toBeInTheDocument();
  });

  it("renders all seven Schema Registry fields", () => {
    render(<AdvancedTab draft={emptyDraft()} onChange={vi.fn()} />);
    expect(screen.getByLabelText("Endpoint")).toBeInTheDocument();
    expect(screen.getByLabelText("Basic auth credentials")).toBeInTheDocument();
    expect(screen.getByLabelText("Trust store location")).toBeInTheDocument();
    expect(screen.getByLabelText("Trust store password")).toBeInTheDocument();
    expect(screen.getByLabelText("Keystore location")).toBeInTheDocument();
    expect(screen.getByLabelText("Keystore password")).toBeInTheDocument();
    expect(screen.getByLabelText("Keystore private key password")).toBeInTheDocument();
  });

  it("masks the schema registry secret fields as password inputs", () => {
    render(<AdvancedTab draft={emptyDraft()} onChange={vi.fn()} />);
    expect(screen.getByLabelText("Basic auth credentials")).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("Trust store password")).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("Keystore password")).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("Keystore private key password")).toHaveAttribute("type", "password");
  });

  it("calls onChange when the schema registry endpoint is typed", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<AdvancedTab draft={emptyDraft()} onChange={onChange} />);

    await user.type(screen.getByLabelText("Endpoint"), "h");

    expect(onChange).toHaveBeenCalledWith({ schemaRegistryEndpoint: "h" });
  });

  it("calls onChange with the selected sasl mechanism", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<AdvancedTab draft={emptyDraft()} onChange={onChange} />);

    await user.selectOptions(screen.getByLabelText("SASL mechanism"), "SCRAM-SHA-256");

    expect(onChange).toHaveBeenCalledWith({ saslMechanism: "SCRAM-SHA-256" });
  });
});
