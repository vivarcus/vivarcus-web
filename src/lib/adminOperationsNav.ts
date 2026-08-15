import type { DisplayText } from "./i18n";
import type { NavTab } from "../api/types";

export const OPERATIONS_PARENT_API_NAME = "platform_admin_operations__v";

export type OperationsSidebarGroup = "jobs" | "email_notifications";

export type AdminOperationsNavGroup = {
  key: OperationsSidebarGroup;
  label: DisplayText;
  subtabs: NavTab[];
};

const label = (text: string, key: string): DisplayText => ({
  text,
  key: `system:${key}`,
  fallback_source: "base_language",
});

const GROUP_ORDER: OperationsSidebarGroup[] = ["jobs", "email_notifications"];

const GROUP_LABEL: Record<OperationsSidebarGroup, DisplayText> = {
  jobs: label("Jobs", "navigation.admin.operations.group.jobs"),
  email_notifications: label(
    "Email Notifications",
    "navigation.admin.operations.group.email_notifications",
  ),
};

export function isAdminOperationsSection(parent: NavTab): boolean {
  return parent.api_name === OPERATIONS_PARENT_API_NAME || parent.route === "/admin/operations";
}

function groupKeyForTab(tab: NavTab): OperationsSidebarGroup | null {
  if (tab.sidebar_group === "jobs" || tab.sidebar_group === "email_notifications") {
    return tab.sidebar_group;
  }
  // Fallback by route when sidebar_group is missing (older nav payloads).
  if (tab.route?.includes("email_notification_status") || tab.route?.includes("email_suppression_list")) {
    return "email_notifications";
  }
  if (
    tab.route?.includes("job_definitions") ||
    tab.route?.includes("job_status") ||
    tab.route?.includes("job_queue") ||
    tab.route?.includes("sdk_job_metadata")
  ) {
    return "jobs";
  }
  return null;
}

export function buildOperationsSidebarGroups(
  subtabs: NavTab[],
  labels: Partial<Record<OperationsSidebarGroup, DisplayText>> = {},
): AdminOperationsNavGroup[] {
  const buckets: Record<OperationsSidebarGroup, NavTab[]> = {
    jobs: [],
    email_notifications: [],
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
    buckets.jobs.push(...ungrouped);
  }
  return GROUP_ORDER.filter((key) => buckets[key].length > 0).map((key) => ({
    key,
    label: labels[key] ?? GROUP_LABEL[key],
    subtabs: buckets[key],
  }));
}
