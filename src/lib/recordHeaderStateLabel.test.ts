import { describe, expect, it } from "vitest";
import { recordHeaderStateLabel } from "./recordHeaderStateLabel";

describe("recordHeaderStateLabel", () => {
  it("prefers lifecycle state over a shared chevron stage", () => {
    const label = recordHeaderStateLabel({
      state_label: { text: "In Approval" },
      state_api_name: "in_approval__c",
      lifecycle_chevron: {
        stages: [
          { api_name: "in_progress__c", label: { text: "In Progress" } },
          { api_name: "in_review__c", label: { text: "In Review" }, current: true },
        ],
      },
    });
    expect(label).toEqual({ text: "In Approval" });
  });

  it("falls back to the current stage when state label is missing", () => {
    const label = recordHeaderStateLabel({
      lifecycle_chevron: {
        stages: [{ api_name: "approved__c", label: { text: "Approved" }, current: true }],
      },
    });
    expect(label).toEqual({ text: "Approved" });
  });

  it("uses the state API name when no label is resolved", () => {
    const label = recordHeaderStateLabel({ state_api_name: "in_qc_review__c" });
    expect(label).toEqual({ text: "in_qc_review__c" });
  });
});
