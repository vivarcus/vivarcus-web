import { describe, expect, it } from "vitest";
import type { FormSection } from "../api/types";
import { applyLayoutRuleEffects } from "./layoutRules";
import { applyDocumentFormReferenceOptions } from "./documentForm";
import { isFieldDisabled } from "../renderers/formUtils";

const support = {
  type_options: [
    { name: "TYPE-1", label: "General" },
    { name: "TYPE-2", label: "TMF Document" },
  ],
  subtype_options_by_type: {
    "TYPE-1": [{ name: "SUB-1", label: "Common" }],
    "TYPE-2": [{ name: "SUB-2", label: "Essential Document" }],
  },
  classification_options_by_subtype: {
    "SUB-1": [{ name: "CLS-1", label: "General Document" }],
  },
};

const baseSections: FormSection[] = [
  {
    name: "details__c",
    label: { text: "Details" },
    elements: [
      {
        kind: "field",
        field_api_name: "type__v",
        label: { text: "Type" },
        field_type: "Object",
        field_render: {
          field_ref: { field_api_name: "type__v" },
          field_type: "Object",
          renderer_kind: "record_picker",
          support_state: "supported",
          visibility: "visible",
          editability: "editable",
          requiredness: "required",
          required_satisfaction: "satisfied",
          target_object_api_name: "document_type__v",
        },
      },
      {
        kind: "field",
        field_api_name: "subtype__v",
        label: { text: "Subtype" },
        field_type: "Object",
        field_render: {
          field_ref: { field_api_name: "subtype__v" },
          field_type: "Object",
          renderer_kind: "record_picker",
          support_state: "supported",
          visibility: "visible",
          editability: "editable",
          requiredness: "optional",
          required_satisfaction: "satisfied",
          target_object_api_name: "document_type__v",
          reference_options: [],
        },
      },
    ],
  },
];

function subtypeElement(sections: FormSection[]) {
  return sections[0].elements.find((el) => el.field_api_name === "subtype__v");
}

describe("applyDocumentFormReferenceOptions", () => {
  it("blocks subtype until type is selected", () => {
    const sections = applyDocumentFormReferenceOptions(baseSections, support, {});
    const subtype = subtypeElement(sections);
    expect(subtype?.field_render?.editability).toBe("readonly");
    expect(subtype?.read_only).toBe(true);
    expect(isFieldDisabled(subtype!)).toBe(true);
    expect(subtype?.field_render?.reference_options).toEqual([]);
  });

  it("enables subtype with filtered options after type is selected", () => {
    const sections = applyDocumentFormReferenceOptions(baseSections, support, {
      type__v: "TYPE-1",
    });
    const subtype = subtypeElement(sections);
    expect(subtype?.field_render?.editability).toBe("editable");
    expect(subtype?.read_only).toBeFalsy();
    expect(isFieldDisabled(subtype!)).toBe(false);
    expect(subtype?.field_render?.reference_options).toEqual([
      { name: "SUB-1", label: "Common" },
    ]);
  });

  it("clears parent gate even when layout rules marked subtype read_only", () => {
    const ruled = applyLayoutRuleEffects(baseSections, {
      readonly_fields: ["subtype__v"],
    });
    const sections = applyDocumentFormReferenceOptions(ruled, support, {
      type__v: "TYPE-1",
    });
    const subtype = subtypeElement(sections);
    expect(subtype?.read_only).toBe(false);
    expect(subtype?.field_render?.editability).toBe("editable");
    expect(isFieldDisabled(subtype!)).toBe(false);
  });

  it("surfaces the blocked-parent gate via controlling_field, not a validation error", () => {
    const sections = applyDocumentFormReferenceOptions(baseSections, support, {});
    const subtype = subtypeElement(sections);
    expect(subtype?.field_render?.controlling_field_api_name).toBe("type__v");
    expect(subtype?.field_render?.hint).toBeUndefined();
    expect(subtype?.field_render?.validation_message).toBeUndefined();
  });
});
