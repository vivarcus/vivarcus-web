import type { FormSection } from "../api/types";

export function applyLookupDisplays(
  sections: FormSection[],
  displays: Record<string, unknown>,
): FormSection[] {
  if (!displays || Object.keys(displays).length === 0) {
    return sections;
  }
  return sections.map((section) => ({
    ...section,
    elements: section.elements.map((el) => {
      if (el.kind !== "field" || !el.field_api_name) {
        return el;
      }
      if (!(el.field_api_name in displays)) {
        return el;
      }
      const displayValue = displays[el.field_api_name];
      return {
        ...el,
        field_render: {
          ...el.field_render,
          display_value:
            displayValue == null || displayValue === "" ? undefined : displayValue,
        },
      };
    }),
  }));
}

export function isLookupFormField(element: FormSection["elements"][number]): boolean {
  return (
    element.kind === "field" &&
    element.field_render?.renderer_kind === "display_text" &&
    element.field_render?.editability === "readonly" &&
    element.field_render?.support_state === "readonly_only"
  );
}
