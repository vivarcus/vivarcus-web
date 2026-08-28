import { describe, expect, it } from "vitest";
import { applyLayoutRuleEffects, visibleFormSections } from "./layoutRules";
import type { FormSection } from "../api/types";

const label = (text: string) => ({ text, fallback_source: "base_language" as const });

const baseSections: FormSection[] = [
  {
    name: "details",
    label: label("Details"),
    elements: [
      { kind: "field", field_api_name: "name__v", label: label("Name") },
      { kind: "field", field_api_name: "status__v", label: label("Status") },
    ],
  },
  {
    name: "extra",
    label: label("Extra"),
    elements: [{ kind: "field", field_api_name: "notes__v", label: label("Notes") }],
  },
];

describe("applyLayoutRuleEffects", () => {
  it("returns sections unchanged when effects are null", () => {
    expect(applyLayoutRuleEffects(baseSections, null)).toEqual(baseSections);
  });

  it("treats null sections as empty", () => {
    expect(applyLayoutRuleEffects(null, null)).toEqual([]);
  });

  it("normalizes null elements when effects are null", () => {
    const sections: FormSection[] = [
      {
        name: "details",
        label: label("Details"),
        elements: null as unknown as FormSection["elements"],
      },
    ];
    expect(applyLayoutRuleEffects(sections, null)).toEqual([
      { ...sections[0], elements: [] },
    ]);
  });

  it("hides fields and marks entire sections hidden", () => {
    const result = applyLayoutRuleEffects(baseSections, {
      hidden_fields: ["status__v"],
      hidden_sections: ["extra"],
      required_fields: [],
      readonly_fields: [],
    });
    expect(result).toHaveLength(2);
    expect(result[0].elements.map((e) => e.field_api_name)).toEqual(["name__v", "status__v"]);
    expect(result[0].elements.find((e) => e.field_api_name === "status__v")?.hidden).toBe(true);
    expect(result[1].hidden).toBe(true);
    expect(result[1].elements.every((e) => e.kind !== "field" || e.hidden)).toBe(true);
  });

  it("marks fields required and read-only", () => {
    const result = applyLayoutRuleEffects(baseSections, {
      hidden_fields: [],
      hidden_sections: [],
      required_fields: ["name__v"],
      readonly_fields: ["status__v"],
    });
    const name = result[0].elements.find((e) => e.field_api_name === "name__v");
    const status = result[0].elements.find((e) => e.field_api_name === "status__v");
    expect(name?.required).toBe(true);
    expect(status?.read_only).toBe(true);
  });

  it("preserves non-field layout elements when applying effects", () => {
    const sections: FormSection[] = [
      {
        name: "details",
        label: label("Details"),
        elements: [
          { kind: "helpSection", name: "help__c", label: label("Help") },
          { kind: "field", field_api_name: "name__v", label: label("Name") },
        ],
      },
    ];
    const result = applyLayoutRuleEffects(sections, {
      hidden_fields: ["name__v"],
      hidden_sections: [],
      required_fields: [],
      readonly_fields: [],
    });
    expect(result[0].elements.map((e) => e.kind)).toEqual(["helpSection", "field"]);
    expect(result[0].elements.find((e) => e.field_api_name === "name__v")?.hidden).toBe(true);
  });

  it("handles null elements when applying effects", () => {
    const sections: FormSection[] = [
      {
        name: "details",
        label: label("Details"),
        elements: null as unknown as FormSection["elements"],
      },
    ];
    const result = applyLayoutRuleEffects(sections, {
      hidden_fields: ["missing__v"],
      hidden_sections: [],
      required_fields: [],
      readonly_fields: [],
    });
    expect(result).toEqual([{ ...sections[0], elements: [], hidden: false }]);
  });

  it("filters hidden sections for display", () => {
    const ruled = applyLayoutRuleEffects(baseSections, {
      hidden_fields: [],
      hidden_sections: ["extra"],
      required_fields: [],
      readonly_fields: [],
    });
    expect(visibleFormSections(ruled)).toHaveLength(1);
    expect(visibleFormSections(ruled)[0].name).toBe("details");
  });

  it("clears server-hidden sections when live evaluation returns no hidden sections", () => {
    const sections: FormSection[] = [
      {
        name: "details",
        label: label("Details"),
        hidden: false,
        elements: [{ kind: "field", field_api_name: "person__clin", label: label("Person") }],
      },
      {
        name: "security_details__c",
        label: label("Security Details"),
        hidden: true,
        elements: [
          {
            kind: "field",
            field_api_name: "create_urs__v",
            label: label("Grant Access"),
            hidden: true,
          },
        ],
      },
    ];
    const result = applyLayoutRuleEffects(sections, {
      hidden_fields: null,
      hidden_sections: null,
      required_fields: null,
      readonly_fields: null,
    });
    expect(visibleFormSections(result).map((sec) => sec.name)).toEqual([
      "details",
      "security_details__c",
    ]);
    expect(result[1].hidden).toBe(false);
    expect(result[1].elements[0].hidden).toBe(false);
  });
});
