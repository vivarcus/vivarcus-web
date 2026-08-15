import type { FormElement, FormSection } from "../../api/types";

export type CreateDomainUserDraft = {
  firstName: string;
  lastName: string;
  localpart: string;
  email: string;
  language: string;
  locale: string;
  timezone: string;
};

export const STAGED_NEW_DOMAIN_USER_VALUE = "__staged_new_domain_user__";

export function stringFieldValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function usernameLocalpart(username: string, domainId: string): string {
  const trimmed = username.trim();
  if (!trimmed || !domainId) return trimmed;
  const suffix = `@${domainId}`;
  if (trimmed.endsWith(suffix)) {
    return trimmed.slice(0, -suffix.length);
  }
  return trimmed.includes("@") ? trimmed.split("@")[0] ?? "" : trimmed;
}

export function findFormField(sections: FormSection[], fieldApiName: string): FormElement | undefined {
  for (const section of sections) {
    for (const element of section.elements ?? []) {
      if (element.kind === "field" && element.field_api_name === fieldApiName) {
        return element;
      }
    }
  }
  return undefined;
}

export function displayNameFromDraft(draft: Pick<CreateDomainUserDraft, "firstName" | "lastName" | "localpart">, domainId: string): string {
  const first = draft.firstName.trim();
  const last = draft.lastName.trim();
  if (first && last) return `${first} ${last}`;
  if (first) return first;
  if (last) return last;
  const localpart = draft.localpart.trim();
  if (localpart && domainId) return `${localpart}@${domainId}`;
  return localpart;
}

export function stagedDomainUserLabel(draft: CreateDomainUserDraft, domainId: string): string {
  const username = draft.localpart.trim() && domainId ? `${draft.localpart.trim()}@${domainId}` : "";
  const displayName = displayNameFromDraft(draft, domainId);
  if (displayName && username && displayName !== username) {
    return `${displayName} (${username})`;
  }
  return username || displayName || "New domain user";
}

export function draftFromValues(values: Record<string, unknown>, domainId: string): CreateDomainUserDraft {
  return {
    firstName: stringFieldValue(values.first_name__sys),
    lastName: stringFieldValue(values.last_name__sys),
    localpart: usernameLocalpart(stringFieldValue(values.username__sys), domainId),
    email: stringFieldValue(values.email__sys),
    language: stringFieldValue(values.language__sys),
    locale: stringFieldValue(values.locale__sys),
    timezone: stringFieldValue(values.timezone__sys),
  };
}

export function isCreateDomainUserDraftValid(draft: CreateDomainUserDraft): boolean {
  return Boolean(
    draft.firstName.trim() &&
      draft.lastName.trim() &&
      draft.localpart.trim() &&
      draft.email.trim() &&
      draft.language &&
      draft.locale &&
      draft.timezone,
  );
}

export function applyCreateDomainUserDraft(
  draft: CreateDomainUserDraft,
  domainId: string,
  onFieldChange: (name: string, value: unknown) => void,
) {
  const username = draft.localpart.trim() && domainId ? `${draft.localpart.trim()}@${domainId}` : "";
  onFieldChange("domain_user_id__sys", "");
  onFieldChange("username__sys", username);
  onFieldChange("first_name__sys", draft.firstName.trim());
  onFieldChange("last_name__sys", draft.lastName.trim());
  onFieldChange("email__sys", draft.email.trim());
  onFieldChange("language__sys", draft.language);
  onFieldChange("locale__sys", draft.locale);
  onFieldChange("timezone__sys", draft.timezone);
  const name = displayNameFromDraft(draft, domainId);
  if (name) {
    onFieldChange("name__v", name);
  }
}
