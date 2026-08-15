import { describe, expect, it, beforeEach } from "vitest";
import {
  applyInlineCriteriaLocks,
  inlineCreateFixedFields,
  mergeInlineCreateValues,
} from "./inlineReferenceCreate";
import { clearReferencePlainLabelCache, rememberReferencePlainLabel } from "./studyScopeReference";
import type { FormSection } from "../api/types";

describe("inlineCreateFixedFields", () => {
  it("maps study from parent clinical user task criteria", () => {
    expect(
      inlineCreateFixedFields("[study__ctms = {{this.study__clin}}]", {
        study__clin: "STU-1",
      }),
    ).toEqual([{ field: "study__ctms", value: "STU-1", sourceField: "study__clin" }]);
  });

  it("skips source bindings when parent value is empty", () => {
    expect(inlineCreateFixedFields("[study__ctms = {{this.study__clin}}]", {})).toEqual([]);
  });

  it("includes literal equality defaults", () => {
    expect(inlineCreateFixedFields("[level__v = 'subtype__v']", {})).toEqual([
      { field: "level__v", value: "subtype__v" },
    ]);
  });
});

describe("mergeInlineCreateValues", () => {
  it("overlays fixed criteria values", () => {
    expect(
      mergeInlineCreateValues({ name__v: "A", study__ctms: "" }, [
        { field: "study__ctms", value: "STU-1", sourceField: "study__clin" },
      ]),
    ).toEqual({ name__v: "A", study__ctms: "STU-1" });
  });
});

describe("applyInlineCriteriaLocks", () => {
  beforeEach(() => {
    clearReferencePlainLabelCache();
  });

  it("locks study as a display link using the parent display label", () => {
    const sections: FormSection[] = [
      {
        label: { text: "Study Details" },
        elements: [
          {
            kind: "field",
            field_api_name: "study__ctms",
            field_type: "Object",
            target_object_api_name: "study__v",
            required: true,
            field_render: {
              renderer_kind: "record_picker",
              editability: "editable",
              target_object_api_name: "study__v",
            },
          },
          {
            kind: "field",
            field_api_name: "study_country__ctms",
            field_type: "Object",
            required: true,
            field_render: { renderer_kind: "record_picker", editability: "editable" },
          },
        ],
      },
    ];

    const locked = applyInlineCriteriaLocks(
      sections,
      [{ field: "study__ctms", value: "STU-1", sourceField: "study__clin" }],
      { study__clin: "s2" },
    );
    const study = locked[0]?.elements[0];
    const country = locked[0]?.elements[1];

    expect(study?.read_only).toBe(true);
    expect(study?.required).toBe(false);
    expect(study?.field_render?.renderer_kind).toBe("display_link");
    expect(study?.field_render?.display_value).toBe("s2");
    expect(study?.field_render?.navigation_target?.route_ref).toBe(
      "/objects/study__v/records/STU-1",
    );
    expect(country?.read_only).toBeFalsy();
    expect(country?.required).toBe(true);
  });

  it("falls back to remembered plain labels", () => {
    rememberReferencePlainLabel("STU-1", "Study Alpha");
    const sections: FormSection[] = [
      {
        label: { text: "Details" },
        elements: [
          {
            kind: "field",
            field_api_name: "study__ctms",
            field_type: "Object",
            target_object_api_name: "study__v",
            field_render: { renderer_kind: "record_picker" },
          },
        ],
      },
    ];
    const locked = applyInlineCriteriaLocks(sections, [
      { field: "study__ctms", value: "STU-1", sourceField: "study__clin" },
    ]);
    expect(locked[0]?.elements[0]?.field_render?.display_value).toBe("Study Alpha");
  });
});
