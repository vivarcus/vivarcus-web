import type { PicklistEntryOption } from "../api/types";

export function languageCodeFromPicklistEntry(entry: string): string {
  const trimmed = entry.trim();
  if (trimmed.endsWith("__sys")) {
    return trimmed.slice(0, -5).replace(/_/g, "-").toLowerCase();
  }
  return trimmed.toLowerCase();
}

export function localeOptionsForLanguage(
  localesByLanguage: Record<string, PicklistEntryOption[]> | undefined,
  languageEntry: string,
  fallback: PicklistEntryOption[],
): PicklistEntryOption[] {
  if (!localesByLanguage) {
    return fallback;
  }
  const code = languageCodeFromPicklistEntry(languageEntry);
  return localesByLanguage[code] ?? fallback;
}

export function isLocaleAllowedForLanguage(
  localesByLanguage: Record<string, PicklistEntryOption[]> | undefined,
  languageEntry: string,
  localeEntry: string,
): boolean {
  if (!localeEntry.trim()) {
    return true;
  }
  const options = localeOptionsForLanguage(localesByLanguage, languageEntry, []);
  return options.some((option) => option.name === localeEntry);
}
