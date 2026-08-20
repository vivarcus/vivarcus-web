import { describe, expect, it } from "vitest";
import type { FormSection } from "../api/types";
import { defaultFormChrome } from "./i18n/chromeTypes";
import {
  applyFieldValidationErrors,
  isEmptySubmittedValue,
  isWritableRequiredField,
  mapServerErrorToFieldErrors,
  validateRecordFormSections,
} from "./recordFormValidation";

const requiredField = {
  kind: "field" as const,
  field_api_name: "name__v",
  label: { text: "Name" },
  field_type: "String",
  field_render: {
    field_ref: { field_api_name: "name__v" },
    field_type: "String",
    renderer_kind: "text_input",
    support_state: "supported" as const,
    visibility: "visible" as const,
    editability: "editable" as const,
    requiredness: "required" as const,
    required_satisfaction: "needs_user_input" as const,
  },
};

const optionalField = {
  kind: "field" as const,
  field_api_name: "notes__v",
  label: { text: "Notes" },
  field_type: "String",
  field_render: {
    field_ref: { field_api_name: "notes__v" },
    field_type: "String",
    renderer_kind: "text_input",
    support_state: "supported" as const,
    visibility: "visible" as const,
    editability: "editable" as const,
    requiredness: "optional" as const,
    required_satisfaction: "satisfied" as const,
  },
};

const sections: FormSection[] = [
  {
    label: { text: "Details" },
    elements: [requiredField, optionalField],
  },
];

describe("recordFormValidation", () => {
  it("treats blank strings and empty arrays as empty", () => {
    expect(isEmptySubmittedValue("")).toBe(true);
    expect(isEmptySubmittedValue("  ")).toBe(true);
    expect(isEmptySubmittedValue([])).toBe(true);
    expect(isEmptySubmittedValue("Alpha")).toBe(false);
    expect(isEmptySubmittedValue(false)).toBe(false);
  });

  it("validates required writable fields before submit", () => {
    const result = validateRecordFormSections(sections, {}, defaultFormChrome.field_required);
    expect(result.valid).toBe(false);
    expect(result.fieldErrors).toEqual({ name__v: "Name is required" });
    expect(result.firstErrorMessage).toBe("Name is required");
  });

  it("skips hidden and readonly required fields", () => {
    const hidden = {
      ...requiredField,
      hidden: true,
    };
    const readonly = {
      ...requiredField,
      field_api_name: "status__v",
      hidden: false,
      read_only: true,
    };
    const result = validateRecordFormSections(
      [{ label: { text: "Details" }, elements: [hidden, readonly] }],
      {},
      defaultFormChrome.field_required,
    );
    expect(result.valid).toBe(true);
  });

  it("applies validation messages to field_render", () => {
    const next = applyFieldValidationErrors(sections, { name__v: "Name is required" });
    expect(next[0].elements[0].field_render?.validation_message).toEqual(["Name is required"]);
    expect(next[0].elements[1].field_render?.validation_message).toBeUndefined();
  });

  it("maps server required errors back to fields", () => {
    expect(mapServerErrorToFieldErrors(sections, "Name is required")).toEqual({
      name__v: "Name is required",
    });
    expect(mapServerErrorToFieldErrors(sections, "Unknown failure")).toBeNull();
    expect(
      mapServerErrorToFieldErrors(
        [
          {
            label: { text: "Details" },
            elements: [
              {
                kind: "field",
                field_api_name: "assigned_to__v",
                label: { text: "Assigned To" },
                field_type: "Object",
              },
            ],
          },
        ],
        'lcw: invalid input: participant group "assigned_to__v" has no assignees',
      ),
    ).toEqual({ assigned_to__v: "Assigned To is required" });
  });

  it("validates email format mask fields before submit", () => {
    const emailField = {
      kind: "field" as const,
      field_api_name: "email__sys",
      label: { text: "Email" },
      field_type: "String",
      field_render: {
        field_ref: { field_api_name: "email__sys" },
        field_type: "String",
        subtype: "Email",
        renderer_kind: "text_input",
        support_state: "supported" as const,
        visibility: "visible" as const,
        editability: "editable" as const,
        requiredness: "required" as const,
        required_satisfaction: "needs_user_input" as const,
      },
    };
    const invalid = validateRecordFormSections(
      [{ label: { text: "Details" }, elements: [emailField] }],
      { email__sys: "not-an-email" },
      defaultFormChrome.field_required,
    );
    expect(invalid.valid).toBe(false);
    expect(invalid.fieldErrors.email__sys).toBe("Please enter a valid email");

    const valid = validateRecordFormSections(
      [{ label: { text: "Details" }, elements: [emailField] }],
      { email__sys: "ada@example.com" },
      defaultFormChrome.field_required,
    );
    expect(valid.valid).toBe(true);
  });

  it("validates standard email field api names without subtype metadata", () => {
    const emailField = {
      kind: "field" as const,
      field_api_name: "email__sys",
      label: { text: "Email" },
      field_type: "String",
      field_render: {
        field_ref: { field_api_name: "email__sys" },
        field_type: "String",
        renderer_kind: "text_input",
        support_state: "supported" as const,
        visibility: "visible" as const,
        editability: "editable" as const,
        requiredness: "required" as const,
        required_satisfaction: "needs_user_input" as const,
      },
    };
    const result = validateRecordFormSections(
      [{ label: { text: "Details" }, elements: [emailField] }],
      { email__sys: "bad-email" },
      defaultFormChrome.field_required,
    );
    expect(result.valid).toBe(false);
    expect(result.fieldErrors.email__sys).toBe("Please enter a valid email");
  });

  it("maps server email format errors back to fields", () => {
    const emailSections: FormSection[] = [
      {
        label: { text: "Details" },
        elements: [
          {
            kind: "field",
            field_api_name: "email__sys",
            label: { text: "Email" },
            field_type: "String",
          },
        ],
      },
    ];
    expect(
      mapServerErrorToFieldErrors(
        emailSections,
        'invalid input: field "email__sys" must be a valid email address',
      ),
    ).toEqual({ email__sys: "Please enter a valid email" });
    expect(mapServerErrorToFieldErrors(emailSections, "Email must be a valid email address")).toEqual({
      email__sys: "Please enter a valid email",
    });
  });

  it("maps server date and number format errors back to fields", () => {
    const sections: FormSection[] = [
      {
        label: { text: "Details" },
        elements: [
          {
            kind: "field",
            field_api_name: "start_date__v",
            label: { text: "Start Date" },
            field_type: "Date",
          },
          {
            kind: "field",
            field_api_name: "enrollment__v",
            label: { text: "Enrollment" },
            field_type: "Number",
          },
        ],
      },
    ];
    expect(mapServerErrorToFieldErrors(sections, "Start Date must be a valid date")).toEqual({
      start_date__v: "Start Date must be a valid date",
    });
    expect(mapServerErrorToFieldErrors(sections, "Enrollment must be a number")).toEqual({
      enrollment__v: "Enrollment must be a number",
    });
    expect(mapServerErrorToFieldErrors(sections, "Enrollment must be at most 100")).toEqual({
      enrollment__v: "Enrollment must be at most 100",
    });
  });

  it("detects writable required fields from field_render", () => {
    expect(isWritableRequiredField(requiredField)).toBe(true);
    expect(isWritableRequiredField(optionalField)).toBe(false);
  });
});
