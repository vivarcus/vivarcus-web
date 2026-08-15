/** Heuristic: multiline text fields in layouts. */
export function isMultilineField(fieldApiName: string, fieldType?: string): boolean {
  if (fieldType === "LongText") {
    return true;
  }
  if (fieldType && fieldType !== "String") {
    return false;
  }
  const name = fieldApiName.toLowerCase();
  return (
    name.includes("description") ||
    name.includes("comment") ||
    name.includes("note") ||
    name.endsWith("_longtext__v") ||
    name.endsWith("_richtext__v")
  );
}

export function isObjectReferenceField(
  fieldType?: string,
  fieldApiName?: string,
  targetObject?: string,
): boolean {
  if (
    fieldType === "Object" ||
    fieldType === "ObjectReference" ||
    fieldType === "ObjectParent" ||
    fieldType === "users"
  ) {
    return true;
  }
  if (targetObject) {
    return true;
  }
  return Boolean(fieldApiName?.endsWith("__vr") || fieldApiName?.endsWith("__vrs"));
}

export function recordDetailHref(
  vaultId: string,
  objectApiName: string,
  recordId: string,
  tabApiName?: string,
): string {
  void vaultId;
  const base = `/objects/${encodeURIComponent(objectApiName)}/records/${encodeURIComponent(recordId)}`;
  if (!tabApiName) {
    return base;
  }
  return `${base}?tab=${encodeURIComponent(tabApiName)}`;
}

export function formatReferenceLabel(
  recordId: string,
  displayValue: unknown,
): string {
  if (displayValue == null || displayValue === "") {
    return "";
  }
  const text = String(displayValue);
  if (text === recordId) {
    return "";
  }
  return text;
}
