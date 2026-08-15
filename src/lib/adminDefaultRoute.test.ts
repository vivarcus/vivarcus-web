import { describe, expect, it } from "vitest";
import { adminChildPath, resolveAdminDefaultHref } from "./adminDefaultRoute";
import type { NavigationModel } from "../api/types";

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
          label: label("Logs"),
          tab: {
            api_name: "platform_admin_logs__v",
            label: label("Logs"),
            kind: "platform",
            route: "/admin/audit-logs",
            subtabs: [
              {
                api_name: "platform_admin_logs_login__v",
                label: label("Login"),
                kind: "platform",
                route: "/admin/audit-logs/login",
              },
            ],
          },
        },
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

describe("adminDefaultRoute", () => {
  it("resolves collection landing to first tab subtab", () => {
    expect(resolveAdminDefaultHref(nav)).toBe("/admin/audit-logs/login");
  });

  it("resolves parent tab landing to first visible subtab", () => {
    expect(resolveAdminDefaultHref(nav, "/admin/users-groups")).toBe(
      "/admin/users-groups/groups",
    );
  });

  it("strips parent prefix for nested redirects", () => {
    expect(adminChildPath("/admin/users-groups", "/admin/users-groups/groups")).toBe("groups");
  });
});
