import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { emptyDraft } from "./draft";
import { SecurityTab } from "./SecurityTab";

describe("SecurityTab", () => {
  it("renders a broker security type dropdown defaulting to Plaintext", () => {
    render(<SecurityTab draft={emptyDraft()} onChange={vi.fn()} />);
    expect(screen.getByLabelText("Type")).toHaveValue("PLAINTEXT");
  });

  it("offers Plaintext, SSL, SASL Plaintext, and SASL SSL as options", () => {
    render(<SecurityTab draft={emptyDraft()} onChange={vi.fn()} />);
    const select = screen.getByLabelText("Type") as HTMLSelectElement;
    const values = Array.from(select.options).map((o) => o.value);
    expect(values).toEqual(["PLAINTEXT", "SSL", "SASL_PLAINTEXT", "SASL_SSL"]);
  });

  it("calls onChange with the selected security protocol", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SecurityTab draft={emptyDraft()} onChange={onChange} />);

    await user.selectOptions(screen.getByLabelText("Type"), "SASL_SSL");

    expect(onChange).toHaveBeenCalledWith({ securityProtocol: "SASL_SSL" });
  });

  it("disables the type dropdown when disabled is true", () => {
    render(<SecurityTab draft={emptyDraft()} onChange={vi.fn()} disabled />);
    expect(screen.getByLabelText("Type")).toBeDisabled();
  });
});
