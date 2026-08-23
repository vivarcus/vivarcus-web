export const EXCLUDED_LIFECYCLE_STATE = "excluded_state__v";

const STUDY_SCOPE_OBJECTS = new Set(["study__v", "study_country__v", "site__v"]);
const USER_SYS_OBJECT = "user__sys";

/** Cap in-memory reference label cache growth during long MCP / acceptance sessions. */
export const REFERENCE_PLAIN_LABEL_CACHE_MAX = 8192;

const plainLabelByRecordId = new Map<string, string>();

export type FormReferenceDisplayContext = {
  formFieldDisplays: Record<string, string>;
  formFieldLabels: Record<string, string>;
  controllingParents: Record<string, string>;
};

type ScopeRecord = {
  record_id?: string;
  fields?: Record<string, unknown>;
};

function touchReferencePlainLabel(id: string, value: string): void {
  if (plainLabelByRecordId.has(id)) {
    plainLabelByRecordId.delete(id);
  } else if (plainLabelByRecordId.size >= REFERENCE_PLAIN_LABEL_CACHE_MAX) {
    const oldest = plainLabelByRecordId.keys().next().value;
    if (oldest !== undefined) {
      plainLabelByRecordId.delete(oldest);
    }
  }
  plainLabelByRecordId.set(id, value);
}

/** Remembers a plain (leaf) reference label for controlling-field path prefixes. */
export function rememberReferencePlainLabel(recordId: string, label: string): void {
  const id = recordId.trim();
  const plain = leafDisplaySegment(label);
  if (!id || !plain) {
    return;
  }
  touchReferencePlainLabel(id, plain);
}

export function lookupReferencePlainLabel(recordId: string): string {
  const id = recordId.trim();
  const label = plainLabelByRecordId.get(id);
  if (label === undefined) {
    return "";
  }
  touchReferencePlainLabel(id, label);
  return label;
}

/** Test helper — clears the in-memory plain-label cache. */
export function clearReferencePlainLabelCache(): void {
  plainLabelByRecordId.clear();
}

export function leafDisplaySegment(display: string): string {
  const parts = display
    .split(" > ")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1]! : "";
}

export function referenceRecordByIdQuery(targetObject: string, recordId: string): string {
  const objectName = targetObject.trim();
  const id = recordId.trim().replace(/'/g, "\\'");
  if (!objectName || !id) {
    return "";
  }
  return `SELECT id, name__v FROM ${objectName} WHERE id = '${id}' LIMIT 1`;
}

export function studyScopeReferenceQuery(targetObject: string): string {
  if (targetObject === USER_SYS_OBJECT) {
    return (
      `SELECT id, name__v, system_owned_user__sys FROM ${USER_SYS_OBJECT} ` +
      `WHERE (system_owned_user__sys = false OR system_owned_user__sys = null) LIMIT 50`
    );
  }
  if (!STUDY_SCOPE_OBJECTS.has(targetObject)) {
    return `SELECT id, name__v FROM ${targetObject} LIMIT 50`;
  }
  // Newest first: Ant Select only filters the loaded page client-side, so a
  // freshly created Study/Country/Site must appear within LIMIT or pickers miss it.
  return (
    `SELECT id, name__v, state__v FROM ${targetObject} ` +
    `ORDER BY created_date__v DESC LIMIT 50`
  );
}

/**
 * When MDL sets controlling_field but leaves relationship_criteria empty (Veeva
 * Study → Study Country → Site pattern), synthesize Criteria VQL so the picker
 * only lists child records that belong to the selected parent.
 *
 * Veeva Help (platform/32567): after selecting Study, Study Country options are
 * limited to countries that belong to that Study; Site is likewise limited by
 * Study Country.
 */
export function synthesizeControllingFieldCriteria(
  targetObject: string,
  controllingFieldApiName: string | undefined,
): string {
  const controller = controllingFieldApiName?.trim() ?? "";
  if (!controller) {
    return "";
  }
  switch (targetObject.trim()) {
    case "study_country__v":
      return `[study__v = {{this.${controller}}}]`;
    case "site__v":
      if (controller.includes("country")) {
        return `[study_country__v = {{this.${controller}}}]`;
      }
      return `[study__v = {{this.${controller}}}]`;
    case "contact_information__clin":
      return `[person__clin = {{this.${controller}}}]`;
    default:
      return "";
  }
}

/** Prefer explicit relationship_criteria; otherwise derive from controlling_field. */
export function resolveEffectiveReferenceCriteria(
  targetObject: string,
  relationshipCriteria: string | undefined,
  controllingFieldApiName: string | undefined,
): string {
  const explicit = relationshipCriteria?.trim() ?? "";
  if (explicit) {
    return explicit;
  }
  return synthesizeControllingFieldCriteria(targetObject, controllingFieldApiName);
}

/**
 * Formats a reference option label using the controlling_field chain on the form.
 * Ancestor labels prefer the plain-label cache (from loaded options), then the
 * leaf segment of each ancestor field's display_value.
 */
export function formatControllingFieldReferenceLabel(
  optionName: string,
  recordId: string,
  controllingFieldApiName: string | undefined,
  controllingParents: Record<string, string>,
  formFieldDisplays: Record<string, string>,
  sourceFieldValues: Record<string, unknown>,
): string {
  const name = optionName.trim();
  const fallback = name || recordId;
  const controller = controllingFieldApiName?.trim() ?? "";
  if (!controller) {
    return fallback;
  }
  const chain: string[] = [];
  const seen = new Set<string>();
  let cur = controller;
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    chain.unshift(cur);
    cur = (controllingParents[cur] ?? "").trim();
  }
  const segments: string[] = [];
  for (const field of chain) {
    const id = String(sourceFieldValues[field] ?? "").trim();
    const fromCache = id ? lookupReferencePlainLabel(id) : "";
    const fromDisplay = leafDisplaySegment(formFieldDisplays[field] ?? "");
    const segment = fromCache || fromDisplay;
    if (segment) {
      segments.push(segment);
    }
  }
  if (name) {
    segments.push(name);
  }
  return segments.length > 0 ? segments.join(" > ") : fallback;
}

export function filterStudyScopeReferenceRecords(
  targetObject: string,
  records: ScopeRecord[],
): ScopeRecord[] {
  if (targetObject === USER_SYS_OBJECT) {
    return records.filter((row) => !isIneligibleUserSysRecord(row.fields));
  }
  if (!STUDY_SCOPE_OBJECTS.has(targetObject)) {
    return records;
  }
  return records.filter((row) => !isExcludedState(row.fields?.state__v));
}

function isIneligibleUserSysRecord(fields?: Record<string, unknown>): boolean {
  if (!fields) {
    return false;
  }
  return isTruthyFlag(fields.system_owned_user__sys);
}

function isTruthyFlag(value: unknown): boolean {
  if (value === true) {
    return true;
  }
  switch (String(value ?? "").trim().toLowerCase()) {
    case "true":
    case "t":
    case "1":
    case "yes":
      return true;
    default:
      return false;
  }
}

function isExcludedState(value: unknown): boolean {
  return String(value ?? "") === EXCLUDED_LIFECYCLE_STATE;
}

/** Collect controlling_field parents, labels, and display_value map from form sections. */
export function collectFormReferenceDisplayContext(
  sections: Array<{
    elements?: Array<{
      field_api_name?: string;
      label?: { text?: string } | string | null;
      field_render?: {
        controlling_field_api_name?: string;
        display_value?: unknown;
      };
    }>;
  }>,
): FormReferenceDisplayContext {
  const formFieldDisplays: Record<string, string> = {};
  const formFieldLabels: Record<string, string> = {};
  const controllingParents: Record<string, string> = {};
  for (const section of sections) {
    for (const el of section.elements ?? []) {
      const fieldName = el.field_api_name?.trim();
      if (!fieldName) {
        continue;
      }
      const fr = el.field_render;
      const controller = fr?.controlling_field_api_name?.trim();
      if (controller) {
        controllingParents[fieldName] = controller;
      }
      const labelText =
        typeof el.label === "string"
          ? el.label.trim()
          : String(el.label?.text ?? "").trim();
      if (labelText) {
        formFieldLabels[fieldName] = labelText;
      }
      if (fr?.display_value != null && String(fr.display_value).trim() !== "") {
        formFieldDisplays[fieldName] = String(fr.display_value);
      }
    }
  }
  return { formFieldDisplays, formFieldLabels, controllingParents };
}

/** Veeva-aligned empty hint for a field gated by controlling_field. */
export function dependsOnControllingFieldHint(
  template: string,
  controllingFieldApiName: string | undefined,
  formFieldLabels: Record<string, string>,
): string {
  const controller = controllingFieldApiName?.trim() ?? "";
  if (!controller || !template.includes("{field}")) {
    return "";
  }
  const label = formFieldLabels[controller]?.trim() || controller;
  return template.replaceAll("{field}", label);
}
