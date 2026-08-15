import type { FormElement } from "../api/types";
import type { DisplayRendererKind, FormRendererKind } from "./types";

const REFERENCE_FIELD_TYPES = new Set([
  "Object",
  "ObjectReference",
  "ObjectParent",
]);

function isReferenceFieldType(fieldType?: string): boolean {
  return fieldType != null && REFERENCE_FIELD_TYPES.has(fieldType);
}

/** Infer form renderer_kind when legacy payloads omit field_render (tests / older API). */
export function inferLegacyFormRendererKind(element: FormElement): FormRendererKind | null {
  const fieldType = element.field_type ?? element.field_render?.field_type;
  if (!fieldType) {
    return "text_input";
  }
  switch (fieldType) {
    case "LongText":
      return "textarea";
    case "RichText":
      if (
        element.read_only ||
        element.field_render?.editability === "readonly"
      ) {
        return "display_rich_text";
      }
      return "rich_text_editor";
    case "Number":
      return "number_input";
    case "Boolean":
      return "boolean_checkbox";
    case "Date":
      return "date_input";
    case "DateTime":
      return "datetime_input";
    case "Picklist":
      return element.field_render?.multi_value ||
        element.field_render?.renderer_kind === "picklist_multiselect"
        ? "picklist_multiselect"
        : "picklist_select";
    case "users":
      return "user_picker";
    case "Object":
    case "ObjectReference":
    case "ObjectParent":
      if (
        element.field_api_name === "image__sys" &&
        (element.target_object_api_name === "media__sys" ||
          element.field_render?.target_object_api_name === "media__sys")
      ) {
        return "image_picker";
      }
      return "record_picker";
    case "Component":
      return "component_picker";
    case "ID":
      return "display_text";
    default:
      if (isReferenceFieldType(fieldType) || element.target_object_api_name) {
        return "record_picker";
      }
      return "text_input";
  }
}

export function resolveFormRendererKind(element: FormElement): FormRendererKind | null {
  if (
    element.support_state === "unsupported" ||
    element.field_render?.support_state === "unsupported"
  ) {
    return null;
  }

  const kind = element.field_render?.renderer_kind?.trim();
  if (kind === "unsupported") {
    return null;
  }
  if (kind && kind !== "") {
    return kind as FormRendererKind;
  }

  return inferLegacyFormRendererKind(element);
}

/** Infer display renderer_kind when legacy payloads omit field_render. */
export function inferLegacyDisplayRendererKind(
  fieldType?: string,
  navigationTarget?: { route_ref?: string } | null,
): DisplayRendererKind {
  if (navigationTarget?.route_ref?.trim()) {
    return "display_link";
  }
  if (fieldType && (isReferenceFieldType(fieldType) || fieldType === "users")) {
    return "display_link";
  }
  return "display_text";
}

export function resolveDisplayRendererKind(input: {
  fieldType?: string;
  fieldRender?: FormElement["field_render"];
  navigationTarget?: { route_ref?: string } | null;
}): DisplayRendererKind {
  const kind = input.fieldRender?.renderer_kind?.trim();
  if (
    kind === "display_link" ||
    kind === "display_text" ||
    kind === "display_rich_text" ||
    kind === "display_icon" ||
    kind === "display_image"
  ) {
    return kind;
  }
  if (input.fieldType === "RichText" || input.fieldRender?.field_type === "RichText") {
    return "display_rich_text";
  }
  if (kind === "unsupported") {
    return "display_text";
  }

  const navTarget = input.navigationTarget ?? input.fieldRender?.navigation_target ?? null;
  return inferLegacyDisplayRendererKind(
    input.fieldType ?? input.fieldRender?.field_type,
    navTarget,
  );
}
