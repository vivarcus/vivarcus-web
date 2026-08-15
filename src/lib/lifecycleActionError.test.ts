import { describe, expect, it } from "vitest";
import { HttpError } from "../api/client";
import { formatEntryCriteriaError, resolveActionErrorMessage } from "./lifecycleActionError";

const shell = {
  lifecycle_entry_criteria_failed: {
    text: "Entry criteria were not met.",
    key: "system:ui.lifecycle_entry_criteria_failed",
    fallback_source: "base_language" as const,
  },
  lifecycle_entry_criteria_failure_body: {
    text: 'This record cannot enter lifecycle state "{state}" because it does not meet one or more entry criteria:',
    key: "system:ui.lifecycle_entry_criteria_failure_body",
    fallback_source: "base_language" as const,
  },
  lifecycle_entry_criteria_failure_footer: {
    text: "Please update the record and try again.",
    key: "system:ui.lifecycle_entry_criteria_failure_footer",
    fallback_source: "base_language" as const,
  },
  lifecycle_entry_criteria_validate_that: {
    text: "Validate that",
    key: "system:ui.lifecycle_entry_criteria_validate_that",
    fallback_source: "base_language" as const,
  },
  lifecycle_entry_criteria_no_records_equal: {
    text: "No records equal",
    key: "system:ui.lifecycle_entry_criteria_no_records_equal",
    fallback_source: "base_language" as const,
  },
  lifecycle_entry_criteria_record_equals: {
    text: "Equals",
    key: "system:ui.lifecycle_entry_criteria_record_equals",
    fallback_source: "base_language" as const,
  },
  lifecycle_entry_criteria_record_not_equals: {
    text: "Is not equal to",
    key: "system:ui.lifecycle_entry_criteria_record_not_equals",
    fallback_source: "base_language" as const,
  },
  lifecycle_entry_criteria_field_is_not_blank: {
    text: "{field} is not blank",
    key: "system:ui.lifecycle_entry_criteria_field_is_not_blank",
    fallback_source: "base_language" as const,
  },
  confirm: {
    text: "Confirm",
    key: "system:ui.confirm",
    fallback_source: "base_language" as const,
  },
};

describe("formatEntryCriteriaError", () => {
  it("formats study closeout related-record violations like Veeva", () => {
    const message = formatEntryCriteriaError(
      {
        error: "entry_criteria_failed",
        failed_rule: "closing_validate_no_open_countries__c",
        target_state_label: "Closing",
        violations: [
          {
            kind: "related_record",
            method: "NONE_EQUALS",
            related_object_label: "Study Countries",
            target_state_label: "Candidate",
          },
        ],
      },
      shell,
    );
    expect(message).toContain(
      'This record cannot enter lifecycle state "Closing" because it does not meet one or more entry criteria:',
    );
    expect(message).toContain("Validate that: Study Countries: No records equal Candidate");
    expect(message).toContain("Please update the record and try again.");
  });

  it("formats outbound EQUALS related-record violations like Veeva First Site Initiated", () => {
    const message = formatEntryCriteriaError(
      {
        error: "entry_criteria_failed",
        target_state_label: "Active",
        violations: [
          {
            kind: "related_record",
            method: "EQUALS",
            related_object_label: "Study Number",
            target_state_label: "Active",
          },
        ],
      },
      shell,
    );
    expect(message).toContain(
      'This record cannot enter lifecycle state "Active" because it does not meet one or more entry criteria:',
    );
    expect(message).toContain("Validate that: Study Number: Equals Active");
    expect(message).toContain("Please update the record and try again.");
  });

  it("formats field entry criteria violations", () => {
    const message = formatEntryCriteriaError(
      {
        error: "entry_criteria_failed",
        target_state_label: "Planning",
        violations: [
          {
            kind: "field",
            constraint: "is_not_blank",
            field_label: "Milestone Master Set",
          },
        ],
      },
      shell,
    );
    expect(message).toContain('lifecycle state "Planning"');
    expect(message).toContain("Validate that: Milestone Master Set is not blank");
  });

  it("formats multiple violations in one message", () => {
    const message = formatEntryCriteriaError(
      {
        error: "entry_criteria_failed",
        target_state_label: "Planning",
        violations: [
          {
            kind: "field",
            constraint: "is_not_blank",
            field_label: "Milestone Master Set",
          },
          {
            kind: "field",
            constraint: "is_not_blank",
            field_label: "EDL Template",
          },
        ],
      },
      shell,
    );
    expect(message).toContain("Validate that: Milestone Master Set is not blank");
    expect(message).toContain("Validate that: EDL Template is not blank");
  });
});

describe("resolveActionErrorMessage", () => {
  it("maps entry criteria failures to Veeva-style messages", () => {
    const err = new HttpError(422, "entry_criteria_failed", {
      error: "entry_criteria_failed",
      target_state_label: "Closing",
      violations: [
        {
          kind: "related_record",
          method: "NONE_EQUALS",
          related_object_label: "Study Countries",
          target_state_label: "Candidate",
        },
      ],
    });
    expect(resolveActionErrorMessage(err, "fallback", shell)).toContain(
      "Validate that: Study Countries: No records equal Candidate",
    );
  });

  it("falls back for non-HTTP errors", () => {
    expect(resolveActionErrorMessage(new Error("boom"), "fallback", shell)).toBe("boom");
    expect(resolveActionErrorMessage(null, "fallback", shell)).toBe("fallback");
  });
});
