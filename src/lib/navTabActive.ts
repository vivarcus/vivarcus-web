import type { NavTab } from "../api/types";

function isVaultHomePath(pathname?: string): boolean {
  return pathname === "/" || pathname === "";
}

function isHomeTab(tab: NavTab): boolean {
  return tab.kind === "task_dashboard" || tab.api_name === "home__v";
}

function isVaultAITab(tab: NavTab): boolean {
  return tab.kind === "vault_ai" || tab.api_name === "vault_ai__sys";
}

function isVaultAIPath(pathname?: string): boolean {
  return pathname === "/vault-ai" || pathname?.startsWith("/vault-ai/") === true;
}

/** Whether a navigation tab should appear active for the current route. */
export function isNavTabActive(
  tab: NavTab,
  activeTab?: string,
  activePageApiName?: string,
  pathname?: string,
): boolean {
  if (isVaultAIPath(pathname)) {
    return isVaultAITab(tab);
  }
  if (isVaultAITab(tab)) {
    return false;
  }
  if (isVaultHomePath(pathname)) {
    return isHomeTab(tab);
  }
  if (isHomeTab(tab)) {
    return false;
  }
  if (tab.kind === "platform" && tab.route && pathname) {
    const suffix = tab.route.startsWith("/") ? tab.route : `/${tab.route}`;
    return pathname.includes(suffix);
  }
  if (tab.kind === "page" && tab.page_api_name) {
    return activePageApiName === tab.page_api_name;
  }
  if (tab.kind === "vault_ai" && tab.route && pathname) {
    return pathname === tab.route || pathname.startsWith(`${tab.route}/`);
  }
  return activeTab === tab.api_name;
}
