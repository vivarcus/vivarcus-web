import type { FormSection, LayoutRuleEffects } from "../api/types";
import { displayText } from "./i18n";

/** Applies server-evaluated layout rule effects to form sections (mirrors CAP-UI applyFormRuleEffects). */
export function applyLayoutRuleEffects(
  sections: FormSection[] | null | undefined,
  effects: LayoutRuleEffects | null,
): FormSection[] {
  const normalized = (sections ?? []).map((sec) => ({
    ...sec,
    elements: sec.elements ?? [],
  }));
  if (!effects) {
    return normalized;
  }
  const hiddenFields = new Set(effects.hidden_fields ?? []);
  const hiddenSections = new Set(effects.hidden_sections ?? []);
  const requiredFields = new Set(effects.required_fields ?? []);
  const readonlyFields = new Set(effects.readonly_fields ?? []);

  const out: FormSection[] = [];
  for (const sec of normalized) {
    const secName = (sec.name ?? "").trim();
    const sectionHidden = Boolean(secName && hiddenSections.has(secName));
    const elements = sec.elements.map((el) => {
      if (sectionHidden && el.kind === "field") {
        return { ...el, hidden: true, required: false };
      }
      if (el.kind !== "field") {
        return el;
      }
      const name = el.field_api_name ?? "";
      if (hiddenFields.has(name)) {
        return { ...el, hidden: true, required: false };
      }
      let next = { ...el, hidden: false };
      if (requiredFields.has(name)) {
        next = { ...next, required: true };
      }
      if (readonlyFields.has(name)) {
        next = { ...next, read_only: true };
      }
      return next;
    });
    out.push({ ...sec, hidden: sectionHidden, elements });
  }
  return out;
}

/** Returns sections that are not hidden by layout rules (for rendering and validation). */
export function visibleFormSections(sections: FormSection[] | null | undefined): FormSection[] {
  return (sections ?? []).filter((sec) => !sec.hidden);
}
