import type { NavTab, NavigationModel } from "../api/types";
import { displayText } from "./i18n";

export type NavObjectOption = {
  apiName: string;
  label: string;
};

/** Finds a tab (or subtab) by api name in the navigation model. */
export function findTabInNav(nav: NavigationModel | null | undefined, tabApiName: string): NavTab | undefined {
  if (!nav) return undefined;
  const target = tabApiName.trim();
  if (!target) return undefined;
  for (const collection of nav.collections) {
    for (const item of collection.items) {
      const tabs = item.tab ? [item.tab] : (item.menu_tabs ?? []);
      for (const tab of tabs) {
        if (tab.api_name === target) return tab;
        for (const sub of tab.subtabs ?? []) {
          if (sub.api_name === target) return sub;
        }
      }
    }
  }
  return undefined;
}

/** Lists every object/page tab node in navigation (including subtabs). */
export function flattenNavTabs(nav: NavigationModel | null | undefined): NavTab[] {
  if (!nav) return [];
  const out: NavTab[] = [];
  for (const collection of nav.collections) {
    for (const item of collection.items) {
      const tabs = item.tab ? [item.tab] : (item.menu_tabs ?? []);
      for (const tab of tabs) {
        out.push(tab);
        out.push(...(tab.subtabs ?? []));
      }
    }
  }
  return out;
}

/**
 * Resolves an Object List tab for a deep link like `/objects/{object}?tab=...`.
 * Prefers `preferredTabApiName` when it is an object tab for that object; otherwise the
 * first object tab bound to the object.
 */
export function findObjectListTabInNav(
  nav: NavigationModel | null | undefined,
  objectApiName: string,
  preferredTabApiName?: string | null,
): NavTab | undefined {
  const objectName = objectApiName.trim();
  if (!objectName) return undefined;
  const preferred = preferredTabApiName?.trim();
  if (preferred) {
    const hinted = findTabInNav(nav, preferred);
    if (hinted?.kind === "object" && hinted.object_api_name?.trim() === objectName) {
      return hinted;
    }
  }
  return flattenNavTabs(nav).find(
    (tab) => tab.kind === "object" && tab.object_api_name?.trim() === objectName,
  );
}

/** Collects unique object api_names from tab navigation. */
export function objectNamesFromNav(nav: NavigationModel): NavObjectOption[] {
  const seen = new Set<string>();
  const out: NavObjectOption[] = [];

  for (const collection of nav.collections) {
    for (const item of collection.items) {
      const tabs = item.tab ? [item.tab] : (item.menu_tabs ?? []);
      for (const tab of tabs) {
        if (tab.object_api_name?.trim()) {
          const apiName = tab.object_api_name.trim();
          if (seen.has(apiName)) continue;
          seen.add(apiName);
          out.push({ apiName, label: displayText(tab.label, apiName) });
        }
        for (const sub of tab.subtabs ?? []) {
          const subApiName = sub.object_api_name?.trim();
          if (!subApiName || seen.has(subApiName)) continue;
          seen.add(subApiName);
          out.push({ apiName: subApiName, label: displayText(sub.label, subApiName) });
        }
      }
    }
  }
  return out;
}
