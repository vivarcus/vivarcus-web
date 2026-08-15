import { describe, expect, it } from "vitest";
import type { NavigationModel } from "../api/types";
import { isLegacyAdminRoute, routeAllowedInNav } from "./adminRoutes";

const nav: NavigationModel = {
  model_type: "navigation",
  vault_id: "vault-1",
  display_context: { language: "en", locale: "en-US", timezone: "UTC" },
  chrome: {} as NavigationModel["chrome"],
  ui_fingerprint: "fp",
  collections: [
    {
      api_name: "admin_tabs__v",
      label: { text: "Admin" },
      system_kind: "admin",
      items: [
        {
          item_type: "tab",
          label: { text: "Logs" },
          tab: {
            api_name: "platform_admin_logs__v",
            label: { text: "Logs" },
            kind: "platform",
            route: "/admin/audit-logs",
            subtabs: [
              {
                api_name: "platform_admin_logs_system__v",
                label: { text: "System Audit History" },
                kind: "platform",
                route: "/admin/audit-logs/system",
              },
            ],
          },
        },
        {
          item_type: "tab",
          label: { text: "Users & Groups" },
          tab: {
            api_name: "platform_admin_users_groups__v",
            label: { text: "Users & Groups" },
            kind: "platform",
            route: "/admin/users-groups",
            subtabs: [
              {
                api_name: "platform_admin_users_groups_vault_users__v",
                label: { text: "Vault Users" },
                kind: "platform",
                route: "/admin/users-groups/vault_users",
              },
              {
                api_name: "platform_admin_users_groups_groups__v",
                label: { text: "Groups" },
                kind: "platform",
                route: "/admin/users-groups/groups",
              },
            ],
          },
        },
      ],
    },
    {
      api_name: "business_admin_tabs__v",
      label: { text: "Business Admin" },
      system_kind: "business_admin",
      items: [
        {
          item_type: "tab",
          label: { text: "Objects" },
          tab: {
            api_name: "platform_business_admin_objects__v",
            label: { text: "Objects" },
            kind: "platform",
            route: "/business-admin/objects",
          },
        },
      ],
    },
  ],
};

describe("adminRoutes", () => {
  it("allows catalog routes present in navigation", () => {
    expect(routeAllowedInNav("/admin/audit-logs", nav)).toBe(true);
    expect(routeAllowedInNav("/admin/audit-logs/system", nav)).toBe(true);
    expect(routeAllowedInNav("/admin/users-groups/vault_users", nav)).toBe(true);
    expect(routeAllowedInNav("/admin/users-groups/groups", nav)).toBe(true);
    expect(routeAllowedInNav("/business-admin/objects", nav)).toBe(true);
    expect(routeAllowedInNav("/business-admin/objects/study__v", nav)).toBe(true);
  });

  it("denies routes missing from navigation", () => {
    expect(routeAllowedInNav("/admin/users-groups/domain_users", nav)).toBe(false);
  });

  it("allows legacy dev admin routes", () => {
    expect(isLegacyAdminRoute("/admin/layout-profiles")).toBe(true);
    expect(routeAllowedInNav("/admin/layout-profiles", null)).toBe(true);
    expect(isLegacyAdminRoute("/admin/configuration/metadata/lifecycles")).toBe(true);
  });

  it("allows Review & Deploy wizard when Deployment inbound tab is present", () => {
    const withDeployment: NavigationModel = {
      ...nav,
      collections: [
        {
          api_name: "admin_tabs__v",
          label: { text: "Admin" },
          system_kind: "admin",
          items: [
            {
              item_type: "tab",
              label: { text: "Deployment" },
              tab: {
                api_name: "platform_admin_deployment__v",
                label: { text: "Deployment" },
                kind: "platform",
                route: "/admin/deployment",
                subtabs: [
                  {
                    api_name: "platform_admin_deployment_inbound_packages__v",
                    label: { text: "Inbound Packages" },
                    kind: "platform",
                    route: "/admin/deployment/inbound_packages",
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    expect(routeAllowedInNav("/admin/deployment/review_deploy/EXZ000000000003", withDeployment)).toBe(
      true,
    );
    expect(routeAllowedInNav("/admin/deployment/review_deploy/EXZ000000000003", nav)).toBe(false);
  });
});
