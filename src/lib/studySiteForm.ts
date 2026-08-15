import type { FormSection } from "../api/types";
import { api } from "../api/client";

export type StudySiteDerivedFromCountry = {
  study__v?: string;
  study_display?: string;
};

export async function fetchStudyDerivedFromCountry(
  vaultId: string,
  studyCountryRecordId: string,
): Promise<StudySiteDerivedFromCountry> {
  const id = studyCountryRecordId.trim();
  if (!id) {
    return {};
  }
  const res = await api.vqlQuery(vaultId, {
    query: `SELECT study__v, study__vr.name__v FROM study_country__v WHERE id = '${id.replace(/'/g, "''")}'`,
  });
  const fields = res.records?.[0]?.fields ?? {};
  const studyId = String(fields.study__v ?? "").trim();
  if (!studyId) {
    return {};
  }
  let studyDisplay = String(fields["study__vr.name__v"] ?? "").trim();
  if (!studyDisplay) {
    const studyRes = await api.vqlQuery(vaultId, {
      query: `SELECT name__v FROM study__v WHERE id = '${studyId.replace(/'/g, "''")}'`,
    });
    studyDisplay = String(studyRes.records?.[0]?.fields?.name__v ?? "").trim();
  }
  return {
    study__v: studyId,
    study_display: studyDisplay || studyId,
  };
}

export function applyStudySiteDerivedFromCountry(
  sections: FormSection[],
  derived: StudySiteDerivedFromCountry,
): FormSection[] {
  if (!derived.study_display) {
    return sections;
  }
  return sections.map((section) => ({
    ...section,
    elements: section.elements.map((el) => {
      if (el.kind !== "field" || el.field_api_name !== "study__v") {
        return el;
      }
      return {
        ...el,
        field_render: {
          ...el.field_render,
          display_value: derived.study_display,
        },
      };
    }),
  }));
}
