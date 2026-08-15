import { describe, expect, it } from "vitest";
import type { FormElement } from "../api/types";
import {
  inferLegacyDisplayRendererKind,
  inferLegacyFormRendererKind,
  resolveDisplayRendererKind,
  resolveFormRendererKind,
} from "./resolveKind";

function formElement(overrides: Partial<FormElement> = {}): FormElement {
  return {
    kind: "field",
    field_api_name: "name__v",
    field_type: "String",
    ...overrides,
  };
}

describe("resolveFormRendererKind", () => {
  it("returns renderer_kind from field_render when present", () => {
    expect(
      resolveFormRendererKind(
        formElement({
          field_render: {
            field_ref: { field_api_name: "owner__v" },
            field_type: "users",
            renderer_kind: "user_picker",
            support_state: "supported",
            visibility: "visible",
            editability: "editable",
            requiredness: "optional",
            required_satisfaction: "satisfied",
            target_object_api_name: "user__sys",
          },
        }),
      ),
    ).toBe("user_picker");
  });

  it("returns null for unsupported fields", () => {
    expect(
      resolveFormRendererKind(
        formElement({
          field_render: {
            field_ref: { field_api_name: "file__v" },
            field_type: "Binary",
            renderer_kind: "unsupported",
            support_state: "unsupported",
            visibility: "hidden",
            editability: "hidden",
            requiredness: "optional",
            required_satisfaction: "blocked",
          },
        }),
      ),
    ).toBeNull();
  });

  it("infers legacy kinds from field_type when field_render is missing", () => {
    expect(inferLegacyFormRendererKind(formElement({ field_type: "LongText" }))).toBe("textarea");
    expect(inferLegacyFormRendererKind(formElement({ field_type: "Number" }))).toBe("number_input");
    expect(inferLegacyFormRendererKind(formElement({ field_type: "Boolean" }))).toBe(
      "boolean_checkbox",
    );
    expect(inferLegacyFormRendererKind(formElement({ field_type: "Date" }))).toBe("date_input");
    expect(inferLegacyFormRendererKind(formElement({ field_type: "DateTime" }))).toBe(
      "datetime_input",
    );
    expect(inferLegacyFormRendererKind(formElement({ field_type: "users" }))).toBe("user_picker");
    expect(
      inferLegacyFormRendererKind(formElement({ field_type: "Object", target_object_api_name: "study__v" })),
    ).toBe("record_picker");
    expect(inferLegacyFormRendererKind(formElement({ field_type: "String" }))).toBe("text_input");
    expect(inferLegacyFormRendererKind(formElement({ field_type: "RichText" }))).toBe(
      "rich_text_editor",
    );
    expect(
      inferLegacyFormRendererKind(
        formElement({ field_type: "RichText", read_only: true }),
      ),
    ).toBe("display_rich_text");
  });

  it("infers picklist multiselect from field_render.multi_value", () => {
    expect(
      inferLegacyFormRendererKind(
        formElement({
          field_type: "Picklist",
          field_render: {
            field_ref: { field_api_name: "tags__v" },
            field_type: "Picklist",
            renderer_kind: "picklist_multiselect",
            support_state: "supported",
            visibility: "visible",
            editability: "editable",
            requiredness: "optional",
            required_satisfaction: "satisfied",
            multi_value: true,
          },
        }),
      ),
    ).toBe("picklist_multiselect");
  });
});

describe("resolveDisplayRendererKind", () => {
  it("prefers explicit display renderer_kind", () => {
    expect(
      resolveDisplayRendererKind({
        fieldRender: {
          field_ref: { field_api_name: "study__vr" },
          field_type: "Object",
          renderer_kind: "display_link",
          support_state: "supported",
          visibility: "visible",
          editability: "readonly",
          requiredness: "optional",
          required_satisfaction: "satisfied",
        },
      }),
    ).toBe("display_link");
  });

  it("infers display_link from navigation_target", () => {
    expect(
      inferLegacyDisplayRendererKind("Object", {
        route_ref: "/objects/study__v/records/v123",
      }),
    ).toBe("display_link");
    expect(inferLegacyDisplayRendererKind("String", null)).toBe("display_text");
    expect(
      resolveDisplayRendererKind({
        fieldType: "RichText",
        fieldRender: {
          field_ref: { field_api_name: "body__v" },
          field_type: "RichText",
          renderer_kind: "display_rich_text",
          support_state: "supported",
          visibility: "visible",
          editability: "readonly",
          requiredness: "optional",
          required_satisfaction: "satisfied",
        },
      }),
    ).toBe("display_rich_text");
  });
});
