import { describe, expect, it } from "vitest";
import { defaultFilterForm, FilterFormState, toMessageFilter } from "./dataFilters";

function blankForm(): FilterFormState {
  return { ...defaultFilterForm(), fromDate: "", toDate: "" };
}

describe("defaultFilterForm", () => {
  it("starts with every non-date field blank and includePayload unchecked", () => {
    const form = defaultFilterForm();
    expect(form.maxMessagesPerPartition).toBe("");
    expect(form.maxTotalMessages).toBe("");
    expect(form.partitions).toBe("");
    expect(form.offset).toBe("");
    expect(form.includePayload).toBe(false);
  });

  it("defaults From to today at 12 AM and To to today at 12 PM", () => {
    const form = defaultFilterForm();
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const datePrefix = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    expect(form.fromDate).toBe(`${datePrefix}T00:00`);
    expect(form.toDate).toBe(`${datePrefix}T12:00`);
  });
});

describe("toMessageFilter", () => {
  it("converts an all-blank form to an all-null, no-payload filter (pull everything, metadata only)", () => {
    expect(toMessageFilter(blankForm())).toEqual({
      partitions: null,
      maxMessagesPerPartition: null,
      maxTotalMessages: null,
      fromTimestampMs: null,
      toTimestampMs: null,
      offset: null,
      includePayload: false,
    });
  });

  it("converts the default form's From/To into today's 12 AM/12 PM epoch milliseconds", () => {
    const filter = toMessageFilter(defaultFilterForm());
    expect(filter.fromTimestampMs).not.toBeNull();
    expect(filter.toTimestampMs).not.toBeNull();
    expect(filter.toTimestampMs).toBeGreaterThan(filter.fromTimestampMs!);
  });

  it("carries includePayload through when checked", () => {
    const form = { ...blankForm(), includePayload: true };
    expect(toMessageFilter(form).includePayload).toBe(true);
  });

  it("parses maxMessagesPerPartition and maxTotalMessages as numbers", () => {
    const form = { ...blankForm(), maxMessagesPerPartition: "50", maxTotalMessages: "500" };
    const filter = toMessageFilter(form);
    expect(filter.maxMessagesPerPartition).toBe(50);
    expect(filter.maxTotalMessages).toBe(500);
  });

  it("parses a comma-separated partitions list into numbers, ignoring extra whitespace", () => {
    const form = { ...blankForm(), partitions: " 0, 2 ,5" };
    expect(toMessageFilter(form).partitions).toEqual([0, 2, 5]);
  });

  it("converts fromDate/toDate datetime-local values to epoch milliseconds", () => {
    const form = { ...blankForm(), fromDate: "2026-01-01T00:00", toDate: "2026-01-02T00:00" };
    const filter = toMessageFilter(form);
    expect(filter.fromTimestampMs).toBe(new Date("2026-01-01T00:00").getTime());
    expect(filter.toTimestampMs).toBe(new Date("2026-01-02T00:00").getTime());
  });

  it("ignores an empty partitions string rather than producing [NaN]", () => {
    const form = { ...blankForm(), partitions: "   " };
    expect(toMessageFilter(form).partitions).toBeNull();
  });

  it("parses offset as a number", () => {
    const form = { ...blankForm(), offset: "100" };
    expect(toMessageFilter(form).offset).toBe(100);
  });
});
