import type { PicklistEntryOption } from "../api/types";

type L10nFormSupport = {
  locale_references_by_language?: Record<string, PicklistEntryOption[]>;
};

export function hasL10nLocaleCascade(
  l10n: L10nFormSupport | null | undefined,
): boolean {
  return Boolean(l10n?.locale_references_by_language);
}
