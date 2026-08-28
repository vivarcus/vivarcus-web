import type { FormElement, FormSection, LayoutRuleEffects } from "../api/types";

/** Server page-build hides layout-ruled fields with a display renderer; live eval must restore edit. */
function restoreUnhiddenFieldRender(el: FormElement, readonly: boolean): FormElement {
  const render = el.field_render;
  if (!render) {
    return readonly ? { ...el, read_only: true } : el;
  }
  const layoutHidden = render.editability === "hidden" || render.visibility === "hidden";
  if (!layoutHidden) {
    if (!readonly) {
      return el;
    }
    return {
      ...el,
      read_only: true,
      field_render: { ...render, editability: "readonly" },
    };
  }
  const nextRender = {
    ...render,
    visibility: "visible" as const,
    editability: readonly ? ("readonly" as const) : ("editable" as const),
  };
  if ((render.renderer_kind ?? "").startsWith("display_")) {
    nextRender.renderer_kind = "";
  }
  return {
    ...el,
    hidden: false,
    read_only: readonly,
    field_render: nextRender,
  };
}

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
      const readonly = readonlyFields.has(name);
      let next = restoreUnhiddenFieldRender({ ...el, hidden: false }, readonly);
      if (requiredFields.has(name)) {
        next = { ...next, required: true };
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
