import { describe, expect, it } from "vitest";
import type { FormSection } from "../api/types";
import { clearReferenceDependents } from "./referenceForm";

function section(elements: FormSection["elements"]): FormSection {
  return { label: "Main", elements };
}

describe("clearReferenceDependents", () => {
  it("clears subject when site changes", () => {
    const sections = [
      section([
        {
          field_api_name: "site__ctms",
          field_render: { renderer_kind: "object_reference" },
        },
        {
          field_api_name: "subject__ctms",
          field_render: {
            renderer_kind: "object_reference",
            controlling_field_api_name: "site__ctms",
            relationship_criteria: "[site__clin = {{this.site__ctms}}]",
          },
        },
      ]),
    ];
    const values = {
      site__ctms: "SITE-2",
      subject__ctms: "SUBJ-1",
    };
    expect(clearReferenceDependents(values, sections, "site__ctms")).toEqual({
      site__ctms: "SITE-2",
      subject__ctms: "",
    });
  });

  it("cascades country -> site -> subject", () => {
    const sections = [
      section([
        {
          field_api_name: "study_country__ctms",
          field_render: {
            renderer_kind: "object_reference",
            controlling_field_api_name: "study__ctms",
          },
        },
        {
          field_api_name: "site__ctms",
          field_render: {
            renderer_kind: "object_reference",
            controlling_field_api_name: "study_country__ctms",
            relationship_criteria: "[study_country__v = {{this.study_country__ctms}}]",
          },
        },
        {
          field_api_name: "subject__ctms",
          field_render: {
            renderer_kind: "object_reference",
            controlling_field_api_name: "site__ctms",
            relationship_criteria: "[site__clin = {{this.site__ctms}}]",
          },
        },
      ]),
    ];
    const values = {
      study_country__ctms: "CN-2",
      site__ctms: "SITE-1",
      subject__ctms: "SUBJ-1",
    };
    expect(clearReferenceDependents(values, sections, "study_country__ctms")).toEqual({
      study_country__ctms: "CN-2",
      site__ctms: "",
      subject__ctms: "",
    });
  });

  it("leaves values unchanged when an unrelated field changes", () => {
    const sections = [
      section([
        {
          field_api_name: "name__v",
          field_render: { renderer_kind: "text" },
        },
        {
          field_api_name: "subject__ctms",
          field_render: {
            renderer_kind: "object_reference",
            controlling_field_api_name: "site__ctms",
            relationship_criteria: "[site__clin = {{this.site__ctms}}]",
          },
        },
      ]),
    ];
    const values = { name__v: "SAE-001", subject__ctms: "SUBJ-1" };
    expect(clearReferenceDependents(values, sections, "name__v")).toEqual(values);
  });
});
