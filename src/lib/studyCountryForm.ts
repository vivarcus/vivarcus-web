import type { FormSection } from "../api/types";
import { api } from "../api/client";

export type StudyCountryDerivedDisplays = {
  country_abbreviation__c?: string;
};

export async function fetchCountryDerivedFields(
  vaultId: string,
  countryRecordId: string,
): Promise<StudyCountryDerivedDisplays> {
  const id = countryRecordId.trim();
  if (!id) {
    return {};
  }
  const res = await api.vqlQuery(vaultId, {
    query: `SELECT abbreviation__c FROM country__v WHERE id = '${id.replace(/'/g, "''")}'`,
  });
  const fields = res.records?.[0]?.fields ?? {};
  const abbreviation = String(fields.abbreviation__c ?? "").trim();
  return abbreviation ? { country_abbreviation__c: abbreviation } : {};
}

export function applyStudyCountryDerivedDisplays(
  sections: FormSection[],
  derived: StudyCountryDerivedDisplays,
): FormSection[] {
  if (!derived.country_abbreviation__c) {
    return sections;
  }
  return sections.map((section) => ({
    ...section,
    elements: section.elements.map((el) => {
      if (el.kind !== "field" || el.field_api_name !== "country_abbreviation__c") {
        return el;
      }
      return {
        ...el,
        field_render: {
          ...el.field_render,
          display_value: derived.country_abbreviation__c,
        },
      };
    }),
  }));
}
