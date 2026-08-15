import type { FormSection } from "../api/types";
import { relationshipCriteriaSourceFields } from "./referenceCriteria";

/** Clears dependent reference fields when a controlling / criteria source field changes. */
export function clearReferenceDependents(
  values: Record<string, unknown>,
  sections: FormSection[],
  changedField: string,
): Record<string, unknown> {
  const dependents = collectReferenceDependents(sections);
  const updated = { ...values };
  const queue = [...(dependents.get(changedField) ?? [])];
  const seen = new Set<string>();

  while (queue.length > 0) {
    const fieldName = queue.shift();
    if (!fieldName || seen.has(fieldName)) {
      continue;
    }
    seen.add(fieldName);
    if (String(updated[fieldName] ?? "").trim() !== "") {
      updated[fieldName] = "";
    }
    for (const child of dependents.get(fieldName) ?? []) {
      queue.push(child);
    }
  }
  return updated;
}

function collectReferenceDependents(sections: FormSection[]): Map<string, string[]> {
  const fieldNames = new Set<string>();
  const criteriaSources = new Map<string, string[]>();
  const controllingParents = new Map<string, string>();

  for (const section of sections) {
    for (const el of section.elements) {
      const fieldName = el.field_api_name?.trim();
      if (!fieldName) {
        continue;
      }
      fieldNames.add(fieldName);
      const fr = el.field_render;
      const criteria = fr?.relationship_criteria?.trim() ?? "";
      if (criteria) {
        criteriaSources.set(fieldName, relationshipCriteriaSourceFields(criteria));
      }
      const controller = fr?.controlling_field_api_name?.trim();
      if (controller) {
        controllingParents.set(fieldName, controller);
      }
    }
  }

  const out = new Map<string, string[]>();
  const addEdge = (parent: string, child: string) => {
    if (!fieldNames.has(parent) || !fieldNames.has(child)) {
      return;
    }
    const existing = out.get(parent) ?? [];
    if (!existing.includes(child)) {
      existing.push(child);
      out.set(parent, existing);
    }
  };

  for (const [fieldName, sources] of criteriaSources) {
    for (const source of sources) {
      addEdge(source, fieldName);
    }
  }
  for (const [fieldName, controller] of controllingParents) {
    addEdge(controller, fieldName);
  }
  return out;
}
