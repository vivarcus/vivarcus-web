import { describe, expect, it } from "vitest";
import type { NavTab } from "../api/types";
import {
  activeDomainSettingsCategory,
  buildSettingsSidebarGroups,
  isAdminSettingsSection,
  isDomainSettingsCategoryActive,
  normalizeSettingsSubtabs,
  DOMAIN_SETTINGS_CATEGORY_NAV,
} from "./adminSettingsNav";

const label = (text: string) => ({ text, fallback_source: "base_language" as const });

const settingsSubtabs: NavTab[] = [
  {
    api_name: "platform_admin_settings_language_region__v",
    label: label("Language & Region"),
    kind: "platform",
    route: "/admin/settings/language-region",
  },
  {
    api_name: "platform_admin_settings_branding__v",
    label: label("Branding"),
    kind: "platform",
    route: "/admin/settings/branding",
  },
  {
    api_name: "platform_admin_settings_domain__v",
    label: label("Domain Settings"),
    kind: "platform",
    route: "/admin/settings/domain",
  },
];

describe("adminSettingsNav", () => {
  it("detects settings parent tabs", () => {
    expect(
      isAdminSettingsSection({
        api_name: "platform_admin_settings__v",
        label: label("Settings"),
        kind: "platform",
        route: "/admin/settings",
      }),
    ).toBe(true);
  });

  it("normalizes API subtabs without sidebar_group metadata", () => {
    const normalized = normalizeSettingsSubtabs(settingsSubtabs);
    expect(normalized.map((tab) => tab.sidebar_group)).toEqual(["vault", "vault"]);
    expect(normalized.map((tab) => tab.api_name)).toEqual([
      "platform_admin_settings_language_region__v",
      "platform_admin_settings_branding__v",
    ]);
  });

  it("builds vault and domain groups in Veeva order", () => {
    const groups = buildSettingsSidebarGroups(settingsSubtabs, {
      vault: label("Vault Settings"),
      domain: label("Domain Settings"),
    });
    expect(groups.map((group) => group.key)).toEqual(["vault", "domain"]);
    expect(groups[0]?.subtabs).toHaveLength(2);
    expect(groups[1]?.domainCategories?.map((item) => item.key)).toEqual([
      "general",
      "features",
      "security-policies",
      "network-access",
      "saml-profiles",
      "oauth-profiles",
    ]);
  });

  it("keeps domain group visible after vault-only normalization", () => {
    const normalized = normalizeSettingsSubtabs(settingsSubtabs);
    expect(normalized.some((tab) => tab.api_name === "platform_admin_settings_domain__v")).toBe(
      false,
    );
    const groups = buildSettingsSidebarGroups(
      normalized,
      {
        vault: label("Vault Settings"),
        domain: label("Domain Settings"),
      },
      { domainSettingsVisible: true },
    );
    expect(groups.map((group) => group.key)).toEqual(["vault", "domain"]);
  });

  it("resolves active domain category from query string", () => {
    expect(
      activeDomainSettingsCategory("/admin/settings/domain", "category=security-policies"),
    ).toBe("security-policies");
    expect(activeDomainSettingsCategory("/admin/settings/domain", "")).toBe("general");
  });

  it("does not highlight domain categories on vault settings routes", () => {
    const general = DOMAIN_SETTINGS_CATEGORY_NAV.find((item) => item.key === "general");
    expect(general).toBeDefined();
    expect(
      isDomainSettingsCategoryActive(general!, "/admin/settings/language-region", ""),
    ).toBe(false);
    expect(
      isDomainSettingsCategoryActive(general!, "/admin/settings/domain", ""),
    ).toBe(true);
  });
});
