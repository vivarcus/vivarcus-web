import { describe, expect, it } from "vitest";
import type { FormSection } from "../api/types";
import {
  FORM_PREFILL_DISPLAY_PREFIX,
  applyFormPrefillDisplays,
  parseFormPrefillDisplays,
} from "./formPrefill";

describe("parseFormPrefillDisplays", () => {
  it("reads prefill_display query params", () => {
    const params = new URLSearchParams();
    params.set(`${FORM_PREFILL_DISPLAY_PREFIX}owning_milestone__v`, "Site Activation");
    expect(parseFormPrefillDisplays(params)).toEqual({
      owning_milestone__v: "Site Activation",
    });
  });
});

describe("applyFormPrefillDisplays", () => {
  const sections: FormSection[] = [
    {
      section_id: "details",
      label: { text: "Details" },
      elements: [
        {
          field_api_name: "owning_milestone__v",
          field_render: {},
        },
      ],
    },
  ];

  it("sets display_value when the field has a prefilled value", () => {
    const next = applyFormPrefillDisplays(
      sections,
      { owning_milestone__v: "Site Activation" },
      { owning_milestone__v: "EZD00000000002X" },
    );
    expect(next[0].elements[0].field_render?.display_value).toBe("Site Activation");
  });

  it("does not override an existing display_value", () => {
    const withDisplay: FormSection[] = [
      {
        ...sections[0],
        elements: [
          {
            field_api_name: "owning_milestone__v",
            field_render: { display_value: "Existing" },
          },
        ],
      },
    ];
    const next = applyFormPrefillDisplays(
      withDisplay,
      { owning_milestone__v: "Site Activation" },
      { owning_milestone__v: "EZD00000000002X" },
    );
    expect(next[0].elements[0].field_render?.display_value).toBe("Existing");
  });
});
