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

export function defaultExpandedSections(sections: SectionLike[]): Set<string> {
  if (sections.length === 0) return new Set();
  return new Set([sectionDomId(sections[0], 0)]);
}

/** Keep currently expanded sections that still exist after a same-record refresh. */
export function retainExpandedSections(
  sections: SectionLike[],
  previous: Set<string>,
): Set<string> {
  const validIds = new Set(sections.map((section, index) => sectionDomId(section, index)));
  const filtered = new Set([...previous].filter((id) => validIds.has(id)));
  if (filtered.size > 0) return filtered;
  return defaultExpandedSections(sections);
}
