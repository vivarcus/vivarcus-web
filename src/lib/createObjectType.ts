import type { ObjectTypeOption } from "../api/types";
import { displayText } from "./i18n";

function objectTypeMatchKey(raw: string): string {
  const lowered = raw.trim().toLowerCase();
  if (!lowered) {
    return "";
  }
  const slug = lowered.replace(/[^a-z0-9_]+/g, "_").replace(/^_|_$/g, "");
  const suffix = slug.lastIndexOf("__");
  return suffix > 0 ? slug.slice(0, suffix) : slug;
}

/** Pick a creatable object type by api_name, label, or Institution→institution__v slug. */
export function matchObjectTypeOption(
  objectTypes: ObjectTypeOption[],
  preferred?: string,
): string {
  const explicit = preferred?.trim();
  if (!explicit) {
    return "";
  }
  const byApi = objectTypes.find((type) => type.api_name === explicit);
  if (byApi) {
    return byApi.api_name;
  }
  const lowered = explicit.toLowerCase();
  const byLabel = objectTypes.find(
    (type) => displayText(type.label, type.api_name).trim().toLowerCase() === lowered,
  );
  if (byLabel) {
    return byLabel.api_name;
  }
  const want = objectTypeMatchKey(explicit);
  if (!want) {
    return "";
  }
  const byKey = objectTypes.find(
    (type) =>
      objectTypeMatchKey(type.api_name) === want ||
      objectTypeMatchKey(displayText(type.label, type.api_name)) === want,
  );
  return byKey?.api_name ?? "";
}

export function pickDefaultObjectType(
  objectTypes: ObjectTypeOption[],
  preferred?: string,
): string {
  return matchObjectTypeOption(objectTypes, preferred) || objectTypes[0]?.api_name || "";
}
