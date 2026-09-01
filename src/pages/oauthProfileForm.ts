/** OAuth / OIDC profile form helpers. */

import type { DomainOAuthProfile, DomainSettingsPageChrome } from "../api/types";
import { displayText } from "../lib/i18n";
import { STATUS_OPTIONS, formatPolicyStatus, statusOptions } from "./securityPolicyForm";

export { STATUS_OPTIONS, formatPolicyStatus, statusOptions };

export const FEISHU_DEFAULTS = {
  authorization_endpoint: "https://accounts.feishu.cn/open-apis/authen/v1/authorize",
  token_endpoint: "https://open.feishu.cn/open-apis/authen/v2/oauth/token",
  userinfo_endpoint: "https://open.feishu.cn/open-apis/authen/v1/user_info",
};

export const PROVIDER_TYPE_OPTIONS = [{ value: "feishu", label: "Feishu" }];

export const PROFILE_LIST_FILTER_OPTIONS = [
  { value: "all", label: "All Profiles" },
  { value: "active", label: "Active Profiles" },
  { value: "inactive", label: "Inactive Profiles" },
];

export function providerTypeOptions(chrome: DomainSettingsPageChrome) {
  return [{ value: "feishu", label: displayText(chrome.provider_feishu, "Feishu") }];
}

export function profileListFilterOptions(chrome: DomainSettingsPageChrome) {
  return [
    { value: "all", label: displayText(chrome.all_profiles, "All Profiles") },
    { value: "active", label: displayText(chrome.active_profiles, "Active Profiles") },
    { value: "inactive", label: displayText(chrome.inactive_profiles, "Inactive Profiles") },
  ];
}

export function formatProviderType(value: string, chrome?: DomainSettingsPageChrome): string {
  if (value === "feishu") {
    return chrome ? displayText(chrome.provider_feishu) : "Feishu";
  }
  const match = PROVIDER_TYPE_OPTIONS.find((o) => o.value === value);
  return match?.label ?? value;
}

export const emptyOAuthProfile = (): Partial<DomainOAuthProfile> & { client_secret?: string } => ({
  profile_key: "",
  name: "",
  description: "",
  provider_type: "feishu",
  status: "active",
  client_id: "",
  client_secret: "",
  ...FEISHU_DEFAULTS,
  jwks_uri: "",
  scopes: [],
  pkce_required: true,
  enable_auth: true,
  enable_file_import: false,
  file_import_scopes: [
    "docs:document:export",
    "drive:export:readonly",
    "drive:file:readonly",
    "drive:drive:readonly",
    "component:selector",
    "search:docs:read",
    "offline_access",
  ],
  login_button_label: "",
});
