import { describe, expect, it } from "vitest";
import { applyStudySiteDerivedFromCountry } from "./studySiteForm";
import type { FormSection } from "../api/types";

describe("applyStudySiteDerivedFromCountry", () => {
  const sections: FormSection[] = [
    {
      section_id: "details",
      title: { text: "Details" },
      elements: [
        {
          kind: "field",
          field_api_name: "study__v",
          label: { text: "Study Number" },
          field_render: { display_value: "study_country__vr.study__v" },
        },
      ],
    },
  ];

  it("replaces study__v display with derived study name", () => {
    const next = applyStudySiteDerivedFromCountry(sections, {
      study__v: "0ST000000000001",
      study_display: "TEST-001",
    });
    expect(next[0].elements[0].field_render?.display_value).toBe("TEST-001");
  });

  it("leaves sections unchanged when no derived display", () => {
    expect(applyStudySiteDerivedFromCountry(sections, {})).toBe(sections);
  });
});
