import type { ObjectTypeOption } from "../api/types";

export function pickDefaultObjectType(
  objectTypes: ObjectTypeOption[],
  preferred?: string,
): string {
  const explicit = preferred?.trim();
  if (explicit && objectTypes.some((type) => type.api_name === explicit)) {
    return explicit;
  }
  return objectTypes[0]?.api_name ?? "";
}
