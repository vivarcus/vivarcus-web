import { describe, expect, it } from "vitest";
import type { NavigationModel } from "../api/types";
import { findAdminSectionNav, isAdminSubtabActive } from "./adminSectionNav";

const label = (text: string) => ({ text, fallback_source: "base_language" as const });

const nav: NavigationModel = {
  model_type: "navigation",
  vault_id: "vault-1",
  display_context: { language: "en", locale: "en-US", timezone: "UTC" },
  chrome: {} as NavigationModel["chrome"],
  ui_fingerprint: "fp",
  collections: [
    {
      api_name: "admin_tabs__v",
      label: label("Admin"),
      system_kind: "admin",
      items: [
        {
          item_type: "tab",
          label: label("Users & Groups"),
          tab: {
            api_name: "platform_admin_users_groups__v",
            label: label("Users & Groups"),
            kind: "platform",
            route: "/admin/users-groups",
            subtabs: [
              {
                api_name: "platform_admin_users_groups_vault_users__v",
                label: label("Vault Users"),
                kind: "platform",
                route: "/admin/users-groups/vault_users",
              },
              {
                api_name: "platform_admin_users_groups_groups__v",
                label: label("Groups"),
                kind: "platform",
                route: "/admin/users-groups/groups",
              },
            ],
          },
        },
      ],
    },
  ],
};

describe("adminSectionNav", () => {
  it("finds parent section for a subtab route", () => {
    const section = findAdminSectionNav("/admin/users-groups/vault_users", nav);
    expect(section?.parent.api_name).toBe("platform_admin_users_groups__v");
    expect(section?.subtabs.map((t) => t.api_name)).toEqual([
      "platform_admin_users_groups_vault_users__v",
      "platform_admin_users_groups_groups__v",
    ]);
  });

  it("returns null when route has no subtabs", () => {
    expect(findAdminSectionNav("/admin/config-diagnostics", nav)).toBeNull();
  });

  it("marks the matching subtab active", () => {
    const section = findAdminSectionNav("/admin/users-groups/groups", nav);
    const groups = section?.subtabs[1];
    expect(groups).toBeDefined();
    expect(isAdminSubtabActive(groups!, "/admin/users-groups/groups")).toBe(true);
    expect(isAdminSubtabActive(groups!, "/admin/users-groups/vault_users")).toBe(false);
  });
});
