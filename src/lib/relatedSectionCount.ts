import type { PageSection, RelatedSectionModel } from "../api/types";
import { sectionDomId } from "../components/record/recordSectionUtils";

export function relatedSectionRowCount(
  section: Pick<RelatedSectionModel, "rows" | "total"> | null | undefined,
): number {
  if (section?.total != null) {
    return section.total;
  }
  const rows = section?.rows;
  return Array.isArray(rows) ? rows.length : 0;
}

export type RelatedSectionCountTarget = {
  sectionId: string;
  token: string;
};

export function collectRelatedSectionCountTargets(
  sections: PageSection[] | null | undefined,
): RelatedSectionCountTarget[] {
  return (sections ?? []).flatMap((section, index) => {
    const related = (section.elements ?? []).find(
      (el) =>
        el.kind === "relatedObject" &&
        el.related?.section_context_token,
    );
    if (!related?.related?.section_context_token) {
      return [];
    }
    // BuildPage already embedded row_count — no need for a count_only round-trip.
    if (typeof related.related.row_count === "number") {
      return [];
    }
    return [
      {
        sectionId: sectionDomId(section, index),
        token: related.related.section_context_token,
      },
    ];
  });
}

/** Seed section nav badge totals from BuildPage-embedded related.row_count. */
export function relatedSectionCountsFromPage(
  sections: PageSection[] | null | undefined,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [index, section] of (sections ?? []).entries()) {
    const related = (section.elements ?? []).find(
      (el) => el.kind === "relatedObject" && el.related,
    );
    if (typeof related?.related?.row_count !== "number") {
      continue;
    }
    out[sectionDomId(section, index)] = related.related.row_count;
  }
  return out;
}
