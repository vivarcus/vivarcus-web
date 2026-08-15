import { describe, expect, it } from "vitest";
import { applyLookupDisplays } from "./lookupForm";
import type { FormSection } from "../api/types";

const sections: FormSection[] = [
  {
    label: { text: "Details" },
    elements: [
      {
        kind: "field",
        field_api_name: "person__clin",
        field_render: { renderer_kind: "record_picker", editability: "editable" },
      },
      {
        kind: "field",
        field_api_name: "first_name__v",
        field_render: {
          renderer_kind: "display_text",
          editability: "readonly",
          support_state: "readonly_only",
        },
      },
      {
        kind: "field",
        field_api_name: "last_name__v",
        field_render: {
          renderer_kind: "display_text",
          editability: "readonly",
          support_state: "readonly_only",
        },
      },
    ],
  },
];

describe("applyLookupDisplays", () => {
  it("updates lookup field display values", () => {
    const next = applyLookupDisplays(sections, {
      first_name__v: "Jane",
      last_name__v: "Smith",
    });
    expect(next[0].elements[1].field_render?.display_value).toBe("Jane");
    expect(next[0].elements[2].field_render?.display_value).toBe("Smith");
  });

  it("clears lookup display when server returns empty value", () => {
    const seeded = applyLookupDisplays(sections, { first_name__v: "Jane" });
    const next = applyLookupDisplays(seeded, { first_name__v: "" });
    expect(next[0].elements[1].field_render?.display_value).toBeUndefined();
  });
});
