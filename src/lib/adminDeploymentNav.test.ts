import { describe, expect, it } from "vitest";
import { buildDeploymentSidebarGroups, isAdminDeploymentSection } from "./adminDeploymentNav";
import type { NavTab } from "../api/types";

const label = (text: string) => ({ text, fallback_source: "base_language" as const });

function tab(partial: Partial<NavTab> & Pick<NavTab, "api_name" | "route">): NavTab {
  return {
    label: label(partial.api_name),
    kind: "platform",
    ...partial,
  };
}

describe("adminDeploymentNav", () => {
  it("detects deployment parent", () => {
    expect(
      isAdminDeploymentSection(
        tab({ api_name: "platform_admin_deployment__v", route: "/admin/deployment" }),
      ),
    ).toBe(true);
  });

  it("groups sandbox and migration views", () => {
    const groups = buildDeploymentSidebarGroups([
      tab({
        api_name: "platform_admin_deployment_sandbox_vaults__v",
        route: "/admin/deployment/sandbox_vaults",
        sidebar_group: "environment",
      }),
      tab({
        api_name: "platform_admin_deployment_sandbox_snapshots__v",
        route: "/admin/deployment/sandbox_snapshots",
        sidebar_group: "environment",
      }),
      tab({
        api_name: "platform_admin_deployment_outbound_packages__v",
        route: "/admin/deployment/outbound_packages",
        sidebar_group: "migration",
      }),
      tab({
        api_name: "platform_admin_deployment_inbound_packages__v",
        route: "/admin/deployment/inbound_packages",
        sidebar_group: "migration",
      }),
    ]);
    expect(groups.map((g) => g.key)).toEqual(["environment", "migration"]);
    expect(groups[0].subtabs).toHaveLength(2);
    expect(groups[1].subtabs).toHaveLength(2);
  });

  it("falls back to migration group by route", () => {
    const groups = buildDeploymentSidebarGroups([
      tab({
        api_name: "platform_admin_deployment_inbound_packages__v",
        route: "/admin/deployment/inbound_packages",
      }),
    ]);
    expect(groups.map((g) => g.key)).toEqual(["migration"]);
  });
});
