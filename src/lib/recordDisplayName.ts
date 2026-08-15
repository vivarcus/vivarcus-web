import type { RecordPageModel } from "../api/types";

function trimDisplayValue(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

/** Resolve name__v from any layout section (not only the first). */
export function recordNameFromSections(
  sections: RecordPageModel["sections"] | undefined,
): string {
  if (!sections) return "";
  for (const section of sections) {
    const hit = (section.elements ?? []).find(
      (el) => el.kind === "field" && el.field_api_name === "name__v",
    );
    const label = trimDisplayValue(hit?.value);
    if (label) return label;
  }
  return "";
}

export function recordDisplayName(
  page: Pick<RecordPageModel, "sections" | "record_name"> | null | undefined,
  recordId: string | undefined,
): string {
  const fromApi = trimDisplayValue(page?.record_name);
  if (fromApi) return fromApi;
  const fromSection = recordNameFromSections(page?.sections);
  if (fromSection) return fromSection;
  return trimDisplayValue(recordId);
}
