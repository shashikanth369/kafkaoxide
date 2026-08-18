import { describe, expect, it } from "vitest";
import { emptyFilterForm, toMessageFilter } from "./dataFilters";

describe("emptyFilterForm", () => {
  it("starts with every field blank", () => {
    const form = emptyFilterForm();
    expect(form.maxMessagesPerPartition).toBe("");
    expect(form.maxTotalMessages).toBe("");
    expect(form.partitions).toBe("");
    expect(form.fromDate).toBe("");
    expect(form.toDate).toBe("");
  });
});

describe("toMessageFilter", () => {
  it("converts an all-blank form to an all-null filter (pull everything)", () => {
    expect(toMessageFilter(emptyFilterForm())).toEqual({
      partitions: null,
      maxMessagesPerPartition: null,
      maxTotalMessages: null,
      fromTimestampMs: null,
      toTimestampMs: null,
    });
  });

  it("parses maxMessagesPerPartition and maxTotalMessages as numbers", () => {
    const form = { ...emptyFilterForm(), maxMessagesPerPartition: "50", maxTotalMessages: "500" };
    const filter = toMessageFilter(form);
    expect(filter.maxMessagesPerPartition).toBe(50);
    expect(filter.maxTotalMessages).toBe(500);
  });

  it("parses a comma-separated partitions list into numbers, ignoring extra whitespace", () => {
    const form = { ...emptyFilterForm(), partitions: " 0, 2 ,5" };
    expect(toMessageFilter(form).partitions).toEqual([0, 2, 5]);
  });

  it("converts fromDate/toDate datetime-local values to epoch milliseconds", () => {
    const form = { ...emptyFilterForm(), fromDate: "2026-01-01T00:00", toDate: "2026-01-02T00:00" };
    const filter = toMessageFilter(form);
    expect(filter.fromTimestampMs).toBe(new Date("2026-01-01T00:00").getTime());
    expect(filter.toTimestampMs).toBe(new Date("2026-01-02T00:00").getTime());
  });

  it("ignores an empty partitions string rather than producing [NaN]", () => {
    const form = { ...emptyFilterForm(), partitions: "   " };
    expect(toMessageFilter(form).partitions).toBeNull();
  });
});
