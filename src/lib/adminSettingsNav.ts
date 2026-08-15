import type { DisplayText } from "./i18n";
import type { NavTab } from "../api/types";

export const SETTINGS_PARENT_API_NAME = "platform_admin_settings__v";

const label = (text: string, key: string): DisplayText => ({
  text,
  key: `system:${key}`,
  fallback_source: "base_language",
});

export type SettingsSidebarGroup = "vault" | "domain";

export type DomainSettingsCategoryKey =
  | "general"
  | "features"
  | "security-policies"
  | "network-access"
  | "saml-profiles"
  | "oauth-profiles";

export type AdminSettingsNavGroup = {
  key: SettingsSidebarGroup;
  label: DisplayText;
  subtabs: NavTab[];
  domainCategories?: DomainSettingsCategoryNavItem[];
};

export type DomainSettingsCategoryNavItem = {
  key: DomainSettingsCategoryKey;
  label: DisplayText;
  route: string;
};

const GROUP_ORDER: SettingsSidebarGroup[] = ["vault", "domain"];

const VAULT_SETTINGS_TAB_ORDER = [
  "platform_admin_settings_language_region__v",
  "platform_admin_settings_security__v",
  "platform_admin_settings_branding__v",
  "platform_admin_settings_search__v",
  "platform_admin_settings_application__v",
  "platform_admin_settings_vault_ai__v",
] as const;

const VAULT_SETTINGS_GROUP_BY_API: Record<string, SettingsSidebarGroup> = {
  platform_admin_settings_language_region__v: "vault",
  platform_admin_settings_security__v: "vault",
  platform_admin_settings_branding__v: "vault",
  platform_admin_settings_search__v: "vault",
  platform_admin_settings_application__v: "vault",
  platform_admin_settings_vault_ai__v: "vault",
  platform_admin_settings_domain__v: "domain",
};

export const DOMAIN_SETTINGS_CATEGORY_NAV: DomainSettingsCategoryNavItem[] = [
  {
    key: "general",
    label: label("General", "domain_settings.general_label"),
    route: "/admin/settings/domain?category=general",
  },
  {
    key: "features",
    label: label("Features", "domain_settings.features_label"),
    route: "/admin/settings/domain?category=features",
  },
  {
    key: "security-policies",
    label: label("Security Policies", "domain_settings.security_policies_label"),
    route: "/admin/settings/domain?category=security-policies",
  },
  {
    key: "network-access",
    label: label("Network Access Rules", "domain_settings.network_access_label"),
    route: "/admin/settings/domain?category=network-access",
  },
  {
    key: "saml-profiles",
    label: label("SAML Profiles", "domain_settings.saml_profiles_label"),
    route: "/admin/settings/domain?category=saml-profiles",
  },
  {
    key: "oauth-profiles",
    label: label("OAuth 2.0 / OIDC Profiles", "domain_settings.oauth_profiles_label"),
    route: "/admin/settings/domain?category=oauth-profiles",
  },
];

export function isAdminSettingsSection(parent: NavTab): boolean {
  return (
    parent.api_name === SETTINGS_PARENT_API_NAME ||
    parent.route === "/admin/settings" ||
    parent.route?.startsWith("/admin/settings/")
  );
}

export function normalizeSettingsSubtabs(subtabs: NavTab[]): NavTab[] {
  const byApi = new Map(subtabs.map((tab) => [tab.api_name, tab]));
  const ordered: NavTab[] = [];
  for (const apiName of VAULT_SETTINGS_TAB_ORDER) {
    const tab = byApi.get(apiName);
    if (!tab) {
      continue;
    }
    ordered.push({
      ...tab,
      sidebar_group: VAULT_SETTINGS_GROUP_BY_API[apiName],
    });
  }
  for (const tab of subtabs) {
    if ((VAULT_SETTINGS_TAB_ORDER as readonly string[]).includes(tab.api_name)) {
      continue;
    }
    if (tab.api_name === "platform_admin_settings_domain__v") {
      continue;
    }
    ordered.push({
      ...tab,
      sidebar_group: VAULT_SETTINGS_GROUP_BY_API[tab.api_name] ?? tab.sidebar_group,
    });
  }
  return ordered;
}

export function hasDomainSettingsAccess(subtabs: NavTab[]): boolean {
  return subtabs.some((tab) => tab.api_name === "platform_admin_settings_domain__v");
}

export function buildSettingsSidebarGroups(
  subtabs: NavTab[],
  groupLabels: Record<SettingsSidebarGroup, DisplayText>,
  options?: { domainSettingsVisible?: boolean },
): AdminSettingsNavGroup[] {
  const normalized = normalizeSettingsSubtabs(subtabs);
  const vaultTabs = normalized.filter((tab) => tab.sidebar_group === "vault");
  const showDomain = options?.domainSettingsVisible ?? hasDomainSettingsAccess(subtabs);
  const groups: AdminSettingsNavGroup[] = [];
  if (vaultTabs.length > 0) {
    groups.push({
      key: "vault",
      label: groupLabels.vault,
      subtabs: vaultTabs,
    });
  }
  if (showDomain) {
    groups.push({
      key: "domain",
      label: groupLabels.domain,
      subtabs: [],
      domainCategories: DOMAIN_SETTINGS_CATEGORY_NAV,
    });
  }
  return groups;
}

export function activeDomainSettingsCategory(
  pathname: string,
  search: string,
): DomainSettingsCategoryKey {
  if (!pathname.startsWith("/admin/settings/domain")) {
    return "general";
  }
  const category = new URLSearchParams(search).get("category")?.trim().toLowerCase() ?? "general";
  const known = DOMAIN_SETTINGS_CATEGORY_NAV.find((item) => item.key === category);
  return known?.key ?? "general";
}

export function isDomainSettingsCategoryActive(
  item: DomainSettingsCategoryNavItem,
  pathname: string,
  search: string,
): boolean {
  if (!pathname.startsWith("/admin/settings/domain")) {
    return false;
  }
  return activeDomainSettingsCategory(pathname, search) === item.key;
}

// Kept for tests and legacy callers.
export function hasSettingsSidebarGroups(subtabs: NavTab[]): boolean {
  return isAdminSettingsSection({ api_name: SETTINGS_PARENT_API_NAME, label: { text: "" }, kind: "platform", route: "/admin/settings" })
    ? normalizeSettingsSubtabs(subtabs).some((tab) => tab.sidebar_group === "vault") ||
        hasDomainSettingsAccess(subtabs)
    : subtabs.some((tab) => tab.sidebar_group === "vault" || tab.sidebar_group === "domain");
}

export function groupSettingsSubtabs(
  subtabs: NavTab[],
  groupLabels: Record<SettingsSidebarGroup, DisplayText>,
): AdminSettingsNavGroup[] {
  return buildSettingsSidebarGroups(subtabs, groupLabels);
}
