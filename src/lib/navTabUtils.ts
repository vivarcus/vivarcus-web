import type { NavTab } from "../api/types";

/** Whether a tab can be navigated to directly (object / page / platform / vault AI / home). */
export function isNavigableTab(tab: NavTab): boolean {
  return (
    tab.kind === "object" ||
    tab.kind === "page" ||
    tab.kind === "platform" ||
    tab.kind === "task_dashboard" ||
    tab.kind === "vault_ai" ||
    tab.api_name === "vault_ai__sys"
  );
}

/** First tab href target: first permitted subtab when present, otherwise the tab itself. */
export function primaryNavTab(tab: NavTab): NavTab {
  // Configuration lands on the hub (Veeva content_setup), not the first component.
  if (
    tab.api_name === "platform_admin_configuration__v" ||
    tab.route === "/admin/configuration"
  ) {
    return tab;
  }
  const subtabs = tab.subtabs ?? [];
  if (subtabs.length > 0) {
    return subtabs[0];
  }
  return tab;
}

export function tabContainsActiveNavTarget(
  tab: NavTab,
  isActive: (candidate: NavTab) => boolean,
): boolean {
  if (isActive(tab)) {
    return true;
  }
  return (tab.subtabs ?? []).some(isActive);
}
