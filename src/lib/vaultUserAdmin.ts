import { api } from "../api/client";
import type { DisplayText } from "./i18n/types";
import type { VaultUserProfileInput } from "../api/types";

/** user__sys is the Vault projection of a Domain User. */
export const VAULT_USER_OBJECT = "user__sys";

/**
 * Editable Domain identity snapshot for a user__sys record, resolved for
 * prefilling the Domain Profile modal and for addressing the Domain User by its
 * UUID. `language`/`locale`/`timezone` are the admin-key/picklist codes the
 * profile endpoint stores (not the user__sys reference record ids).
 */
export type VaultUserAdminProfile = {
  /** domain_user_id__sys — the {userID} path param for the vault-users endpoints. */
  domainUserId: string;
  /** username__sys — immutable, shown read-only. */
  username: string;
  firstName: string;
  lastName: string;
  companyName: string;
  email: string;
  language: string;
  locale: string;
  timezone: string;
  productAnnouncementEmails: boolean;
  serviceAvailabilityNotifications: boolean;
};

export type SecurityPolicyOption = { value: string; label: string };

function vqlString(fields: Record<string, unknown>, key: string): string {
  const raw = fields[key];
  if (raw == null) return "";
  if (Array.isArray(raw)) {
    return raw.length > 0 ? String(raw[0] ?? "").trim() : "";
  }
  return String(raw).trim();
}

function vqlBool(fields: Record<string, unknown>, key: string): boolean {
  const raw = fields[key];
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "number") return raw !== 0;
  if (typeof raw === "string") {
    const v = raw.trim().toLowerCase();
    return v === "true" || v === "1" || v === "yes";
  }
  return false;
}

function escapeVqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Loads the editable Domain identity fields for a user__sys record via VQL.
 * Reference fields are traversed to their admin-key codes so the values can be
 * submitted directly to PUT /profile.
 */
export async function fetchVaultUserAdminProfile(
  vaultId: string,
  recordId: string,
): Promise<VaultUserAdminProfile> {
  const query =
    "SELECT domain_user_id__sys, username__sys, first_name__sys, last_name__sys, " +
    "company__sys, email__sys, language__sysr.admin_key__sys, locale__sysr.admin_key__sys, " +
    "timezone__sys, product_announcement_emails__sys, system_availability_emails__sys " +
    `FROM ${VAULT_USER_OBJECT} WHERE id = '${escapeVqlLiteral(recordId)}'`;
  const res = await api.vqlQuery(vaultId, { query });
  const fields = res.records?.[0]?.fields ?? {};
  return {
    domainUserId: vqlString(fields, "domain_user_id__sys"),
    username: vqlString(fields, "username__sys"),
    firstName: vqlString(fields, "first_name__sys"),
    lastName: vqlString(fields, "last_name__sys"),
    companyName: vqlString(fields, "company__sys"),
    email: vqlString(fields, "email__sys"),
    language: vqlString(fields, "language__sysr.admin_key__sys"),
    locale: vqlString(fields, "locale__sysr.admin_key__sys"),
    timezone: vqlString(fields, "timezone__sys"),
    productAnnouncementEmails: vqlBool(fields, "product_announcement_emails__sys"),
    serviceAvailabilityNotifications: vqlBool(fields, "system_availability_emails__sys"),
  };
}

/** Maps the loaded snapshot to the PUT /profile request body. */
export function toProfileInput(profile: VaultUserAdminProfile): VaultUserProfileInput {
  return {
    first_name: profile.firstName.trim(),
    last_name: profile.lastName.trim(),
    company_name: profile.companyName.trim(),
    email: profile.email.trim(),
    language: profile.language.trim(),
    locale: profile.locale.trim(),
    timezone: profile.timezone.trim(),
    product_announcement_emails: profile.productAnnouncementEmails,
    service_availability_notifications: profile.serviceAvailabilityNotifications,
  };
}

/**
 * Lists Domain Security Policies assignable to a user: reuses the Domain
 * Settings model and keeps only active, non system-managed policies (mirrors the
 * backend guard in vaultuser.Service.UpdateUserSecurityPolicy).
 */
export async function fetchAssignableSecurityPolicies(
  vaultId: string,
): Promise<SecurityPolicyOption[]> {
  const model = await api.domainSettings(vaultId, "security-policies");
  return (model.security_policies ?? [])
    .filter(
      (policy) =>
        !policy.system_managed &&
        policy.status?.trim().toLowerCase() === "active" &&
        policy.policy_key?.trim(),
    )
    .map((policy) => ({
      value: policy.policy_key,
      label: policy.name?.trim() || policy.policy_key,
    }));
}

const t = (text: string): DisplayText => ({ text });

/** Client-side default labels (English), following the existing chrome pattern. */
export const vaultUserAdminChrome = {
  section_title: t("User Administration"),
  edit_profile: t("Edit Domain Profile"),
  security_policy: t("Security Policy"),
  loading: t("Loading user administration…"),
  unavailable: t("Domain user actions are unavailable for this record."),
  // Edit profile modal.
  edit_profile_title: t("Edit Domain Profile"),
  username_label: t("Username"),
  first_name_label: t("First Name"),
  last_name_label: t("Last Name"),
  company_name_label: t("Company"),
  email_label: t("Email"),
  language_label: t("Language"),
  locale_label: t("Locale"),
  timezone_label: t("Timezone"),
  product_announcement_label: t("Product Announcement Emails"),
  service_availability_label: t("Service Availability Notifications"),
  username_readonly_hint: t("Username cannot be changed."),
  code_hint: t("Enter the admin-key code (e.g. en, en_US, UTC)."),
  // Security policy modal.
  security_policy_title: t("Assign Security Policy"),
  policy_label: t("Security Policy"),
  policy_placeholder: t("Select a security policy"),
  policy_manual_label: t("Policy Key"),
  policy_manual_hint: t(
    "Could not load the policy list; enter the policy key directly.",
  ),
  federated_id_label: t("Federated ID"),
  federated_id_hint: t(
    "Optional. For SSO policies, leave blank to bind on first login; ignored for password policies.",
  ),
  save: t("Save"),
  cancel: t("Cancel"),
} as const;
