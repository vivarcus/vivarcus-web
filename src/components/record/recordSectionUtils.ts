import type { DisplayText } from "../../api/types";
import { displayText } from "../../lib/i18n";

export type SectionLike = {
  name?: string;
  label: DisplayText;
  hidden?: boolean;
};

export function recordFieldDomId(fieldApiName: string): string {
  return `field-${fieldApiName.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

export function sectionDomId(section: SectionLike, index: number): string {
  const name = section.name?.trim();
  if (name) {
    return `section-${name.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  }
  return `section-${index}`;
}

export function sectionKey(section: SectionLike, index: number): string {
  return section.name ?? displayText(section.label, String(index));
}

/** Smooth-scroll to a record section anchor (after expand if needed). */
export function scrollToRecordSection(sectionId: string) {
  requestAnimationFrame(() => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

export function sectionExpandStorageKey(
  vaultId: string,
  objectName: string,
  recordId: string,
  layout?: string,
): string {
  return `vivarcus.record-sections.${vaultId}.${objectName}.${recordId}.${layout ?? "__default__"}`;
}

export function readExpandedSections(storageKey: string): Set<string> | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const ids = parsed.filter((id): id is string => typeof id === "string");
    return ids.length > 0 ? new Set(ids) : null;
  } catch {
    return null;
  }
}

export function writeExpandedSections(storageKey: string, expanded: Set<string>): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify([...expanded]));
  } catch {
    // ignore quota / private mode errors
  }
}

export function resolveExpandedSections(
  sections: SectionLike[],
  storageKey: string,
  fallbackFirst = true,
): Set<string> {
  const validIds = new Set(sections.map((section, index) => sectionDomId(section, index)));
  const stored = readExpandedSections(storageKey);
  if (stored) {
    const filtered = new Set([...stored].filter((id) => validIds.has(id)));
    if (filtered.size > 0) return filtered;
  }
  if (!fallbackFirst || sections.length === 0) return new Set();
  return new Set([sectionDomId(sections[0], 0)]);
}
