import type { FormSection } from "../api/types";

/** URL query keys: `prefill_display.{field_api_name}` → human label for reference prefills. */
export const FORM_PREFILL_DISPLAY_PREFIX = "prefill_display.";

export function parseFormPrefillDisplays(
  searchParams: URLSearchParams,
): Record<string, string> {
  const out: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    if (key.startsWith(FORM_PREFILL_DISPLAY_PREFIX) && value.trim()) {
      out[key.slice(FORM_PREFILL_DISPLAY_PREFIX.length)] = value.trim();
    }
  });
  return out;
}

/** Apply URL display prefills onto form sections when the field already has a value. */
export function applyFormPrefillDisplays(
  sections: FormSection[],
  displays: Record<string, string>,
  values: Record<string, unknown>,
): FormSection[] {
  if (Object.keys(displays).length === 0) {
    return sections;
  }
  return sections.map((section) => ({
    ...section,
    elements: section.elements.map((el) => {
      const field = el.field_api_name?.trim();
      if (!field) {
        return el;
      }
      const display = displays[field];
      if (!display) {
        return el;
      }
      const value = values[field];
      if (value == null || String(value).trim() === "") {
        return el;
      }
      const existing = el.field_render?.display_value;
      if (existing != null && String(existing).trim() !== "") {
        return el;
      }
      return {
        ...el,
        field_render: {
          ...el.field_render,
          display_value: display,
        },
      };
    }),
  }));
}
