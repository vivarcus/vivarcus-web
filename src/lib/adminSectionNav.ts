import type { NavTab, NavigationModel } from "../api/types";
import {
  hasDomainSettingsAccess,
  isAdminSettingsSection,
  normalizeSettingsSubtabs,
  SETTINGS_PARENT_API_NAME,
} from "./adminSettingsNav";
import {
  entriesFromCollection,
  findAdminCollection,
  findBusinessAdminCollection,
} from "./navCollection";

function normalizeRoute(route: string): string {
  return route.startsWith("/") ? route : `/${route}`;
}

function platformTabMatchesPathname(tab: NavTab, pathname: string): boolean {
  if (tab.kind !== "platform" || !tab.route) {
    return false;
  }
  const route = normalizeRoute(tab.route);
  return pathname === route || pathname.startsWith(`${route}/`);
}

function findParentTabForPathname(
  collection: NavigationModel["collections"][number],
  pathname: string,
): NavTab | null {
  for (const entry of entriesFromCollection(collection)) {
    const tabs = entry.kind === "tab" ? [entry.tab] : entry.tabs;
    for (const tab of tabs) {
      const subtabs = tab.subtabs ?? [];
      if (subtabs.length === 0) {
        continue;
      }
      if (
        platformTabMatchesPathname(tab, pathname) ||
        subtabs.some((sub) => platformTabMatchesPathname(sub, pathname))
      ) {
        return tab;
      }
    }
  }
  return null;
}

const settingsFallbackSubtabs: NavTab[] = [
  {
    api_name: "platform_admin_settings_language_region__v",
    label: { text: "Language & Region", fallback_source: "base_language" as const },
    kind: "platform" as const,
    route: "/admin/settings/language-region",
    sidebar_group: "vault",
  },
  {
    api_name: "platform_admin_settings_security__v",
    label: { text: "Security Settings", fallback_source: "base_language" as const },
    kind: "platform" as const,
    route: "/admin/settings/security",
    sidebar_group: "vault",
  },
  {
    api_name: "platform_admin_settings_branding__v",
    label: { text: "Branding", fallback_source: "base_language" as const },
    kind: "platform" as const,
    route: "/admin/settings/branding",
    sidebar_group: "vault",
  },
  {
    api_name: "platform_admin_settings_search__v",
    label: { text: "Search", fallback_source: "base_language" as const },
    kind: "platform" as const,
    route: "/admin/settings/search",
    sidebar_group: "vault",
  },
  {
    api_name: "platform_admin_settings_domain__v",
    label: { text: "Domain Settings", fallback_source: "base_language" as const },
    kind: "platform" as const,
    route: "/admin/settings/domain",
    sidebar_group: "domain",
  },
];

function finalizeSettingsSection(parent: NavTab, subtabs: NavTab[]): AdminSectionNav {
  const resolvedSubtabs = subtabs.length > 0 ? subtabs : settingsFallbackSubtabs;
  const domainSettingsVisible = hasDomainSettingsAccess(resolvedSubtabs);
  return {
    parent,
    subtabs: isAdminSettingsSection(parent) ? normalizeSettingsSubtabs(resolvedSubtabs) : resolvedSubtabs,
    domainSettingsVisible,
  };
}

function settingsFallbackSection(
  collection: NavigationModel["collections"][number],
  pathname: string,
): AdminSectionNav | null {
  if (!pathname.startsWith("/admin/settings")) {
    return null;
  }

  for (const entry of entriesFromCollection(collection)) {
    const tabs = entry.kind === "tab" ? [entry.tab] : entry.tabs;
    for (const tab of tabs) {
      if (tab.api_name !== SETTINGS_PARENT_API_NAME && tab.route !== "/admin/settings") {
        continue;
      }
      const subtabs =
        tab.subtabs && tab.subtabs.length > 0 ? tab.subtabs : settingsFallbackSubtabs;
      return finalizeSettingsSection(tab, subtabs);
    }
  }
  return null;
}

export type AdminSectionNav = {
  parent: NavTab;
  subtabs: NavTab[];
  domainSettingsVisible?: boolean;
};

export function findAdminSectionNav(
  pathname: string,
  nav: NavigationModel | null | undefined,
): AdminSectionNav | null {
  if (!nav) {
    return null;
  }

  const isAdmin = pathname.startsWith("/admin");
  const isBusinessAdmin = pathname.startsWith("/business-admin");
  if (!isAdmin && !isBusinessAdmin) {
    return null;
  }

  const collection = isAdmin
    ? findAdminCollection(nav.collections)
    : findBusinessAdminCollection(nav.collections);
  if (!collection) {
    return null;
  }

  const parent = findParentTabForPathname(collection, pathname);
  if (parent) {
    const subtabs = parent.subtabs ?? [];
    if (subtabs.length > 0) {
      return finalizeSettingsSection(parent, subtabs);
    }
    if (isAdminSettingsSection(parent) && pathname.startsWith("/admin/settings")) {
      return finalizeSettingsSection(parent, settingsFallbackSubtabs);
    }
  }

  return settingsFallbackSection(collection, pathname);
}

export function isAdminSubtabActive(tab: NavTab, pathname: string): boolean {
  return platformTabMatchesPathname(tab, pathname);
}
