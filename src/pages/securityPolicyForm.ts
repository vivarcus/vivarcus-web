/** Security Policy form helpers and Veeva-aligned option lists. */

import type { DomainSecurityPolicy } from "../api/types";

export const SESSION_IDLE_OPTIONS = [
  { value: 0, label: "Domain Default Duration" },
  { value: 10, label: "10 minutes" },
  { value: 15, label: "15 minutes" },
  { value: 20, label: "20 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "1 hour" },
  { value: 120, label: "2 hours" },
  { value: 240, label: "4 hours" },
  { value: 480, label: "8 hours" },
];

export const LOCKOUT_UNLOCK_OPTIONS = [
  { value: 0, label: "Permanent" },
  { value: 5, label: "5 minutes" },
  { value: 10, label: "10 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 60, label: "60 minutes" },
];

export const PASSWORD_EXPIRY_OPTIONS = [
  { value: 0, label: "Never" },
  { value: 30, label: "Expires in 30 days" },
  { value: 60, label: "Expires in 60 days" },
  { value: 90, label: "Expires in 90 days" },
  { value: 180, label: "Expires in 180 days" },
  { value: 365, label: "Expires in 365 days" },
  { value: 720, label: "Expires in 720 days" },
];

export const PASSWORD_HISTORY_OPTIONS = Array.from({ length: 21 }, (_, count) => ({
  value: count,
  label:
    count === 0
      ? "Do not track password history"
      : `Prevent the reuse of the last ${count} password${count === 1 ? "" : "s"}`,
}));

export const PASSWORD_RESET_LIMIT_OPTIONS = [
  { value: 0, label: "Unlimited" },
  ...Array.from({ length: 10 }, (_, i) => {
    const n = i + 1;
    return { value: n, label: `${n} per day` };
  }),
];

export const API_TOKEN_EXPIRY_OPTIONS = [
  { value: 0, label: "Never" },
  { value: 30, label: "Expires in 30 days" },
  { value: 60, label: "Expires in 60 days" },
  { value: 90, label: "Expires in 90 days" },
  { value: 180, label: "Expires in 180 days" },
  { value: 365, label: "Expires in 365 days" },
  { value: 720, label: "Expires in 720 days" },
];

export const AUTH_TYPE_OPTIONS = [
  { value: "password", label: "Password" },
  { value: "sso", label: "SSO" },
];

export const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export const POLICY_LIST_FILTER_OPTIONS = [
  { value: "all", label: "All Policies" },
  { value: "active", label: "Active Policies" },
  { value: "inactive", label: "Inactive Policies" },
];

export function formatAuthenticationType(value: string): string {
  switch (value) {
    case "sso":
      return "SSO";
    case "cross_domain":
      return "Cross-Domain";
    default:
      return "Password";
  }
}

export function formatPolicyStatus(value: string): string {
  return value === "inactive" ? "Inactive" : "Active";
}

export function formatPasswordExpiry(days: number): string {
  const match = PASSWORD_EXPIRY_OPTIONS.find((o) => o.value === days);
  if (match) return match.label;
  if (days <= 0) return "Never";
  return `Expires in ${days} days`;
}

export function formatPasswordHistory(count: number): string {
  const match = PASSWORD_HISTORY_OPTIONS.find((o) => o.value === count);
  if (match) return match.label;
  return count === 0
    ? "Do not track password history"
    : `Prevent the reuse of the last ${count} password${count === 1 ? "" : "s"}`;
}

export function formatPasswordResetLimit(limit: number): string {
  const match = PASSWORD_RESET_LIMIT_OPTIONS.find((o) => o.value === limit);
  return match?.label ?? (limit <= 0 ? "Unlimited" : `${limit} per day`);
}

export function formatLockoutDuration(minutes: number): string {
  const match = LOCKOUT_UNLOCK_OPTIONS.find((o) => o.value === minutes);
  return match?.label ?? `${minutes} minutes`;
}

export function formatSessionIdle(minutes: number): string {
  const match = SESSION_IDLE_OPTIONS.find((o) => o.value === minutes);
  return match?.label ?? `${minutes} minutes`;
}

export function nearestSelectValue<T extends { value: number; label: string }>(
  options: T[],
  value: number,
): number {
  if (options.some((o) => o.value === value)) return value;
  return options[0]?.value ?? value;
}

export const emptySecurityPolicy = (): Partial<DomainSecurityPolicy> => ({
  policy_key: "",
  name: "",
  description: "",
  status: "active",
  authentication_type: "password",
  password_min_length: 8,
  password_require_upper: true,
  password_require_lower: true,
  password_require_digit: true,
  password_require_special: false,
  password_expiry_days: 0,
  password_history_count: 5,
  password_reset_daily_limit: 0,
  require_security_question: false,
  allow_browser_password_save: true,
  lockout_threshold: 5,
  lockout_unlock_minutes: 30,
  saml_profile_id: "",
  esignature_profile_id: "",
  oauth_profile_id: "",
  api_token_expiry_days: 30,
  session_idle_timeout_minutes: 0,
  session_max_lifetime_hours: 48,
  mfa_required: false,
  mfa_methods: ["totp"],
  delegate_allowed: false,
  delegate_max_days: 30,
  compliance_text: "",
  compliance_version: "",
});
