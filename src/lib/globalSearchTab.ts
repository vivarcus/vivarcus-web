import type { NavTab, NavigationModel } from "../api/types";
import { displayText } from "./i18n";
import { findTabInNav } from "./navObjects";

/** Default Object Tab when the user is not already on a searchable object tab. */
export const DEFAULT_SEARCH_TAB = "library__v";

export type SearchableTabOption = {
  apiName: string;
  label: string;
};

/** Object tabs eligible for header keyword search (Library included as a normal object tab). */
export function isSearchableObjectTab(tab: NavTab | undefined): boolean {
  if (!tab) return false;
  if (tab.admin_tab) return false;
  if (!tab.object_api_name?.trim()) return false;
  switch (tab.kind) {
    case "page":
    case "document":
    case "web":
      return false;
    case "object":
      return true;
    default:
      return true;
  }
}

/** Lists searchable Object Tabs in nav order (deduped by api_name). */
export function listSearchableObjectTabs(
  nav: NavigationModel | null | undefined,
): SearchableTabOption[] {
  if (!nav) return [];
  const seen = new Set<string>();
  const out: SearchableTabOption[] = [];
  const push = (tab: NavTab) => {
    if (!isSearchableObjectTab(tab) || seen.has(tab.api_name)) return;
    seen.add(tab.api_name);
    out.push({
      apiName: tab.api_name,
      label: displayText(tab.label, tab.api_name),
    });
  };
  for (const collection of nav.collections) {
    for (const item of collection.items) {
      const tabs = item.tab ? [item.tab] : (item.menu_tabs ?? []);
      for (const tab of tabs) {
        push(tab);
        for (const sub of tab.subtabs ?? []) {
          push(sub);
        }
      }
    }
  }
  return out;
}

/**
 * Resolves the Object Tab that header search should target.
 * Current searchable Object Tab wins; otherwise Library.
 */
export function resolveHeaderSearchTab(
  nav: NavigationModel | null | undefined,
  currentTabApiName: string | undefined,
): string {
  const current = currentTabApiName?.trim();
  if (current && nav) {
    const tab = findTabInNav(nav, current);
    if (isSearchableObjectTab(tab)) {
      return tab!.api_name;
    }
  }
  if (current) {
    const scopes = nav?.global_search_scopes ?? [];
    if (scopes.some((scope) => scope.id === current)) {
      return current;
    }
  }
  return DEFAULT_SEARCH_TAB;
}
