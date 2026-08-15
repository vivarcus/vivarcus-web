import type { FormSection } from "../api/types";
import {
  fixedFieldsFromRelationshipCriteria,
  type InlineCriteriaFixedField,
} from "./referenceCriteria";
import { lookupReferencePlainLabel } from "./studyScopeReference";

export type { InlineCriteriaFixedField };

/** Resolve create-form defaults from the parent picker's relationship_criteria. */
export function inlineCreateFixedFields(
  criteria: string | undefined,
  sourceValues: Record<string, unknown> | undefined,
): InlineCriteriaFixedField[] {
  return fixedFieldsFromRelationshipCriteria(criteria?.trim() ?? "", sourceValues ?? {});
}

/** Merge criteria-fixed values into create form values (criteria wins for listed fields). */
export function mergeInlineCreateValues(
  base: Record<string, unknown>,
  fixedFields: InlineCriteriaFixedField[],
): Record<string, unknown> {
  if (fixedFields.length === 0) {
    return base;
  }
  const next = { ...base };
  for (const fixed of fixedFields) {
    next[fixed.field] = fixed.value;
  }
  return next;
}

/**
 * Lock criteria-fixed fields like Veeva related/inline create: read-only display link
 * for object references, plain read-only otherwise.
 */
export function applyInlineCriteriaLocks(
  sections: FormSection[],
  fixedFields: InlineCriteriaFixedField[],
  sourceDisplays: Record<string, string> = {},
): FormSection[] {
  if (fixedFields.length === 0) {
    return sections;
  }
  const byField = new Map(fixedFields.map((fixed) => [fixed.field, fixed]));
  return sections.map((section) => ({
    ...section,
    elements: (section.elements ?? []).map((el) => {
      if (el.kind !== "field" || !el.field_api_name) {
        return el;
      }
      const fixed = byField.get(el.field_api_name);
      if (!fixed) {
        return el;
      }
      const targetObject = (
        el.target_object_api_name?.trim() ||
        el.field_render?.target_object_api_name?.trim() ||
        ""
      );
      const fromSource =
        fixed.sourceField != null
          ? String(sourceDisplays[fixed.sourceField] ?? "").trim()
          : "";
      const display =
        fromSource || lookupReferencePlainLabel(fixed.value) || fixed.value;
      const isObjectRef =
        targetObject !== "" ||
        el.field_type === "Object" ||
        el.field_type === "ObjectReference" ||
        el.field_type === "ObjectParent" ||
        el.field_render?.field_type === "Object" ||
        el.field_render?.field_type === "ObjectReference" ||
        el.field_render?.field_type === "ObjectParent";

      if (isObjectRef && targetObject) {
        return {
          ...el,
          read_only: true,
          required: false,
          field_render: {
            ...el.field_render,
            renderer_kind: "display_link",
            editability: "readonly",
            display_value: display,
            target_object_api_name:
              el.field_render?.target_object_api_name ?? targetObject,
            navigation_target: {
              kind: "record_detail",
              target_object_ref: targetObject,
              target_record_id: fixed.value,
              route_ref: `/objects/${targetObject}/records/${fixed.value}`,
            },
          },
        };
      }

      return {
        ...el,
        read_only: true,
        required: false,
        field_render: {
          ...el.field_render,
          editability: "readonly",
          display_value: display,
          ...(isObjectRef
            ? { renderer_kind: "display_link" as const }
            : { renderer_kind: el.field_render?.renderer_kind ?? "display_text" }),
        },
      };
    }),
  }));
}
