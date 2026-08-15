import type { DisplayText, NavCollection, NavTab } from "../api/types";
import { isNavTabActive } from "./navTabActive";
import { primaryNavTab, tabContainsActiveNavTarget } from "./navTabUtils";
import { tabHref } from "./tabHref";

export type CollectionKind = "all" | "business_admin" | "admin" | "other";

export type NavEntry =
  | { kind: "tab"; tab: NavTab }
  | { kind: "menu"; label: DisplayText; tabs: NavTab[] };

export function collectionKind(collection: NavCollection): CollectionKind {
  switch (collection.system_kind) {
    case "all":
      return "all";
    case "business_admin":
      return "business_admin";
    case "admin":
      return "admin";
    default:
      return "other";
  }
}

export function isAdminCollection(collection: NavCollection): boolean {
  return collection.system_kind === "admin";
}

export function isBusinessAdminCollection(collection: NavCollection): boolean {
  return collection.system_kind === "business_admin";
}

export function isManagementCollection(collection: NavCollection): boolean {
  return isAdminCollection(collection) || isBusinessAdminCollection(collection);
}

export function entriesFromCollection(collection: NavCollection): NavEntry[] {
  const entries: NavEntry[] = [];
  for (const item of collection.items) {
    if (item.tab) {
      entries.push({ kind: "tab", tab: item.tab });
      continue;
    }
    if (item.menu_tabs?.length) {
      entries.push({ kind: "menu", label: item.label, tabs: item.menu_tabs });
    }
  }
  return entries;
}

export function entryContainsActiveTab(
  entry: NavEntry,
  activeTab?: string,
  activePageApiName?: string,
  pathname?: string,
): boolean {
  const isActive = (tab: NavTab) =>
    isNavTabActive(tab, activeTab, activePageApiName, pathname);

  if (entry.kind === "tab") {
    return tabContainsActiveNavTarget(entry.tab, isActive);
  }
  return entry.tabs.some((tab) => tabContainsActiveNavTarget(tab, isActive));
}

export function collectionHasActiveEntry(
  entries: NavEntry[],
  activeTab?: string,
  activePageApiName?: string,
  pathname?: string,
): boolean {
  return entries.some((entry) =>
    entryContainsActiveTab(entry, activeTab, activePageApiName, pathname),
  );
}

export function findCollectionForActiveTab(
  collections: NavCollection[],
  activeTab?: string,
  activePageApiName?: string,
  pathname?: string,
): NavCollection | undefined {
  if (!activeTab && !activePageApiName && !pathname) {
    return undefined;
  }
  return collections.find((collection) =>
    entriesFromCollection(collection).some((entry) =>
      entryContainsActiveTab(entry, activeTab, activePageApiName, pathname),
    ),
  );
}

export function findAdminCollection(collections: NavCollection[]): NavCollection | undefined {
  return collections.find(isAdminCollection);
}

export function findBusinessAdminCollection(collections: NavCollection[]): NavCollection | undefined {
  return collections.find(isBusinessAdminCollection);
}

export function firstTabInCollection(vaultId: string, collection: NavCollection): string | undefined {
  for (const entry of entriesFromCollection(collection)) {
    if (entry.kind === "tab") {
      return tabHref(vaultId, primaryNavTab(entry.tab));
    }
    if (entry.tabs[0]) {
      return tabHref(vaultId, primaryNavTab(entry.tabs[0]));
    }
  }
  return undefined;
}

export function findActiveTabMeta(
  collections: NavCollection[],
  activeTab?: string,
  activePageApiName?: string,
): NavTab | undefined {
  for (const collection of collections) {
    for (const entry of entriesFromCollection(collection)) {
      if (entry.kind === "tab") {
        if (isNavTabActive(entry.tab, activeTab, activePageApiName)) {
          return entry.tab;
        }
        const sub = entry.tab.subtabs?.find((item) =>
          isNavTabActive(item, activeTab, activePageApiName),
        );
        if (sub) return sub;
        continue;
      }
      for (const tab of entry.tabs) {
        if (isNavTabActive(tab, activeTab, activePageApiName)) {
          return tab;
        }
        const sub = tab.subtabs?.find((item) =>
          isNavTabActive(item, activeTab, activePageApiName),
        );
        if (sub) return sub;
      }
    }
  }
  return undefined;
}

export function firstObjectTab(collections: NavCollection[]): NavTab | undefined {
  for (const collection of collections) {
    for (const entry of entriesFromCollection(collection)) {
      const tabs = entry.kind === "tab" ? [entry.tab] : entry.tabs;
      for (const tab of tabs) {
        const target = primaryNavTab(tab);
        if (target.kind === "object") {
          return target;
        }
      }
    }
  }
  return undefined;
}
