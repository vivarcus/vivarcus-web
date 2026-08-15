import { describe, expect, it } from "vitest";
import { buildOperationsSidebarGroups, isAdminOperationsSection } from "./adminOperationsNav";
import type { NavTab } from "../api/types";

const label = (text: string) => ({ text, fallback_source: "base_language" as const });

function tab(partial: Partial<NavTab> & Pick<NavTab, "api_name" | "route">): NavTab {
  return {
    label: label(partial.api_name),
    kind: "platform",
    ...partial,
  };
}

describe("adminOperationsNav", () => {
  it("detects operations parent", () => {
    expect(
      isAdminOperationsSection(
        tab({ api_name: "platform_admin_operations__v", route: "/admin/operations" }),
      ),
    ).toBe(true);
  });

  it("groups jobs and email notification status", () => {
    const groups = buildOperationsSidebarGroups([
      tab({
        api_name: "platform_admin_operations_job_definitions__v",
        route: "/admin/operations/job_definitions",
        sidebar_group: "jobs",
      }),
      tab({
        api_name: "platform_admin_operations_email_notification_status__v",
        route: "/admin/operations/email_notification_status",
        sidebar_group: "email_notifications",
      }),
      tab({
        api_name: "platform_admin_operations_email_suppression_list__v",
        route: "/admin/operations/email_suppression_list",
        sidebar_group: "email_notifications",
      }),
    ]);
    expect(groups.map((g) => g.key)).toEqual(["jobs", "email_notifications"]);
    expect(groups[0].subtabs).toHaveLength(1);
    expect(groups[1].subtabs).toHaveLength(2);
    expect(groups[1].subtabs.map((t) => t.api_name)).toEqual([
      "platform_admin_operations_email_notification_status__v",
      "platform_admin_operations_email_suppression_list__v",
    ]);
  });

  it("falls back to email_notifications group by route", () => {
    const groups = buildOperationsSidebarGroups([
      tab({
        api_name: "platform_admin_operations_email_suppression_list__v",
        route: "/admin/operations/email_suppression_list",
      }),
    ]);
    expect(groups.map((g) => g.key)).toEqual(["email_notifications"]);
  });
});
