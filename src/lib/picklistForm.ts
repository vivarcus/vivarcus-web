import type { FormElement, FormSection, PicklistEntryOption } from "../api/types";
import { normalizePicklistSelection } from "../renderers/formUtils";

function dependencyAllowedNames(
  dependencies: Record<string, string[]> | undefined,
  controllingValue: string,
): string[] | null {
  if (!dependencies) {
    return null;
  }
  const control = controllingValue.trim();
  if (!control) {
    return [];
  }
  return dependencies[control] ?? [];
}

function filterCatalogByAllowed(
  catalog: PicklistEntryOption[],
  allowed: string[] | null,
): PicklistEntryOption[] {
  if (allowed === null) {
    return catalog;
  }
  if (allowed.length === 0) {
    return [];
  }
  const allowedSet = new Set(allowed);
  return catalog.filter((entry) => allowedSet.has(entry.name));
}

function appendMissingSelectedOptions(
  options: PicklistEntryOption[],
  selected: string[],
  displayFallback?: string,
): PicklistEntryOption[] {
  const out = [...options];
  const present = new Set(out.map((entry) => entry.name));
  const displayLabels =
    typeof displayFallback === "string" && displayFallback.trim()
      ? displayFallback.split(",").map((part) => part.trim()).filter(Boolean)
      : [];

  selected.forEach((name, index) => {
    if (!name || present.has(name)) {
      return;
    }
    let label = name;
    if (displayLabels.length === selected.length) {
      label = displayLabels[index] || name;
    } else if (displayLabels.length === 1 && selected.length === 1) {
      label = displayLabels[0];
    }
    out.push({
      name,
      label,
      inactive: true,
      selectable: false,
    });
    present.add(name);
  });
  return out;
}

function withPicklistField(
  el: FormElement,
  options: PicklistEntryOption[],
  blockedByParent: boolean,
  parentHint?: string,
): FormElement {
  const fieldRender = {
    ...el.field_render,
    picklist_options: options,
  };
  if (blockedByParent) {
    fieldRender.editability = "readonly";
    fieldRender.hint = parentHint ? [parentHint] : fieldRender.hint;
    fieldRender.validation_message = undefined;
  } else if (fieldRender.hint?.length === 1 && fieldRender.hint[0] === parentHint) {
    fieldRender.hint = undefined;
    fieldRender.editability = "editable";
  }
  return {
    ...el,
    read_only: blockedByParent || el.read_only,
    field_render: fieldRender,
  };
}

export function applyPicklistCascadeOptions(
  sections: FormSection[],
  values: Record<string, unknown>,
  parentHint = "Select the controlling field first",
): FormSection[] {
  return sections.map((section) => ({
    ...section,
    elements: section.elements.map((el) => {
      const fr = el.field_render;
      if (!fr?.picklist_dependencies || !fr.picklist_options_catalog?.length) {
        return el;
      }
      const controller = fr.controlling_field_api_name?.trim() ?? "";
      const controlValue = controller ? String(values[controller] ?? "").trim() : "";
      const allowed = dependencyAllowedNames(fr.picklist_dependencies, controlValue);
      const blockedByParent = allowed !== null && controlValue === "";
      let options = filterCatalogByAllowed(fr.picklist_options_catalog, allowed);
      const selected = normalizePicklistSelection(values[el.field_api_name ?? ""]);
      options = appendMissingSelectedOptions(
        options,
        selected,
        typeof fr.display_value === "string" ? fr.display_value : undefined,
      );
      return withPicklistField(el, options, blockedByParent, parentHint);
    }),
  }));
}

export function collectPicklistDependents(sections: FormSection[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const section of sections) {
    for (const el of section.elements) {
      const controller = el.field_render?.controlling_field_api_name?.trim();
      const fieldName = el.field_api_name?.trim();
      if (!controller || !fieldName) {
        continue;
      }
      const existing = out.get(controller) ?? [];
      existing.push(fieldName);
      out.set(controller, existing);
    }
  }
  return out;
}

export function pruneInvalidPicklistValues(
  values: Record<string, unknown>,
  sections: FormSection[],
  changedField: string,
): Record<string, unknown> {
  const dependents = collectPicklistDependents(sections);
  const queue = [...(dependents.get(changedField) ?? [])];
  const updated = { ...values };
  const seen = new Set<string>();

  while (queue.length > 0) {
    const fieldName = queue.shift();
    if (!fieldName || seen.has(fieldName)) {
      continue;
    }
    seen.add(fieldName);

    const element = findFormElement(sections, fieldName);
    const fr = element?.field_render;
    if (!fr?.picklist_dependencies) {
      continue;
    }
    const controller = fr.controlling_field_api_name?.trim() ?? "";
    const controlValue = controller ? String(updated[controller] ?? "").trim() : "";
    const allowed = dependencyAllowedNames(fr.picklist_dependencies, controlValue);
    if (allowed === null) {
      continue;
    }
    const allowedSet = new Set(allowed);
    const current = normalizePicklistSelection(updated[fieldName]);
    const next = current.filter((entry) => allowedSet.has(entry));
    if (fr.multi_value) {
      updated[fieldName] = next;
    } else {
      updated[fieldName] = next[0] ?? "";
    }
    for (const child of dependents.get(fieldName) ?? []) {
      queue.push(child);
    }
  }
  return updated;
}

function findFormElement(sections: FormSection[], fieldName: string): FormElement | undefined {
  for (const section of sections) {
    for (const el of section.elements) {
      if (el.field_api_name === fieldName) {
        return el;
      }
    }
  }
  return undefined;
}

export function isPicklistOptionSelectable(entry: PicklistEntryOption): boolean {
  if (entry.inactive) {
    return false;
  }
  if (entry.selectable === false) {
    return false;
  }
  return true;
}
