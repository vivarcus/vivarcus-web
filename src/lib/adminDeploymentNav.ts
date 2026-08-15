import type { DisplayText } from "./i18n";
import type { NavTab } from "../api/types";

export const DEPLOYMENT_PARENT_API_NAME = "platform_admin_deployment__v";

export type DeploymentSidebarGroup = "environment" | "migration";

export type AdminDeploymentNavGroup = {
  key: DeploymentSidebarGroup;
  label: DisplayText;
  subtabs: NavTab[];
};

const label = (text: string, key: string): DisplayText => ({
  text,
  key: `system:${key}`,
  fallback_source: "base_language",
});

const GROUP_ORDER: DeploymentSidebarGroup[] = ["environment", "migration"];

const GROUP_LABEL: Record<DeploymentSidebarGroup, DisplayText> = {
  environment: label("Environment", "navigation.admin.deployment.group.environment"),
  migration: label("Migration", "navigation.admin.deployment.group.migration"),
};

export function isAdminDeploymentSection(parent: NavTab): boolean {
  return parent.api_name === DEPLOYMENT_PARENT_API_NAME || parent.route === "/admin/deployment";
}

function groupKeyForTab(tab: NavTab): DeploymentSidebarGroup | null {
  if (tab.sidebar_group === "environment" || tab.sidebar_group === "migration") {
    return tab.sidebar_group;
  }
  if (tab.route?.includes("sandbox_vaults") || tab.route?.includes("sandbox_snapshots")) {
    return "environment";
  }
  if (tab.route?.includes("outbound_packages") || tab.route?.includes("inbound_packages")) {
    return "migration";
  }
  return null;
}

export function buildDeploymentSidebarGroups(subtabs: NavTab[]): AdminDeploymentNavGroup[] {
  const buckets: Record<DeploymentSidebarGroup, NavTab[]> = {
    environment: [],
    migration: [],
  };
  const ungrouped: NavTab[] = [];
  for (const tab of subtabs) {
    const key = groupKeyForTab(tab);
    if (key) {
      buckets[key].push(tab);
    } else {
      ungrouped.push(tab);
    }
  }
  if (ungrouped.length > 0) {
    buckets.environment.push(...ungrouped);
  }
  return GROUP_ORDER.filter((key) => buckets[key].length > 0).map((key) => ({
    key,
    label: GROUP_LABEL[key],
    subtabs: buckets[key],
  }));
}
