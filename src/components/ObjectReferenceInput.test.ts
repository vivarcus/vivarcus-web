import { describe, expect, it } from "vitest";
import { formatReferenceCreateObjectLabel, mergeReferenceOptions } from "./ObjectReferenceInput";

describe("mergeReferenceOptions", () => {
  it("returns options unchanged when no value is selected", () => {
    const options = [{ recordId: "1", label: "One" }];
    expect(mergeReferenceOptions(options, "")).toBe(options);
  });

  it("returns options unchanged when the selected value is already listed", () => {
    const options = [{ recordId: "1", label: "One" }];
    expect(mergeReferenceOptions(options, "1")).toBe(options);
  });

  it("appends the selected value so it stays readable when missing from the list", () => {
    const result = mergeReferenceOptions([{ recordId: "1", label: "One" }], "rec-9", "Study Alpha");
    expect(result).toHaveLength(2);
    expect(result[1].recordId).toBe("rec-9");
    expect(result[1].label).toBeTruthy();
  });

  it("falls back to the raw id when no display label is available", () => {
    expect(mergeReferenceOptions([], "rec-9")).toEqual([
      { recordId: "rec-9", label: "rec-9" },
    ]);
  });
});

describe("formatReferenceCreateObjectLabel", () => {
  it("humanizes object api names for the create action label", () => {
    expect(formatReferenceCreateObjectLabel("study_communication_log__ctms")).toBe(
      "Study Communication Log",
    );
    expect(formatReferenceCreateObjectLabel("risk_mitigation__v")).toBe("Risk Mitigation");
  });
});
