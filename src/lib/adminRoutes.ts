import type { NavTab, NavigationModel } from "../api/types";
import {
  entriesFromCollection,
  findAdminCollection,
  findBusinessAdminCollection,
  isAdminCollection,
  isBusinessAdminCollection,
  type CollectionKind,
} from "./navCollection";

/** Dev-only admin routes kept outside the catalog until Configuration UI ships.
 *  `/admin/configuration/metadata` is a temporary redirect shell to flattened routes. */
export const LEGACY_ADMIN_ROUTES = [
  "/admin/layout-profiles",
  "/admin/layout-preview",
  "/admin/configuration/metadata",
];

/** Admin action wizards opened from record actions (not themselves nav tabs). */
export const ADMIN_ACTION_ROUTES = ["/admin/deployment/review_deploy"];

export function isLegacyAdminRoute(pathname: string): boolean {
  return LEGACY_ADMIN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function isAdminActionRoute(pathname: string): boolean {
  return ADMIN_ACTION_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function tabRouteMatches(pathname: string, tab: NavTab): boolean {
  if (tab.kind !== "platform" || !tab.route) {
    return false;
  }
  const route = tab.route.startsWith("/") ? tab.route : `/${tab.route}`;
  const subtabs = tab.subtabs ?? [];
  if (subtabs.length > 0) {
    if (pathname === route) {
      return true;
    }
    return subtabs.some((sub) => tabRouteMatches(pathname, sub));
  }
  return pathname === route || pathname.startsWith(`${route}/`);
}

function collectionAllowsPathname(collection: NavigationModel["collections"][number], pathname: string): boolean {
  for (const entry of entriesFromCollection(collection)) {
    const tabs = entry.kind === "tab" ? [entry.tab] : entry.tabs;
    for (const tab of tabs) {
      if (tabRouteMatches(pathname, tab)) {
        return true;
      }
    }
  }
  return false;
}

export function routeAllowedInNav(pathname: string, nav: NavigationModel | null | undefined): boolean {
  if (isLegacyAdminRoute(pathname)) {
    return true;
  }
  if (!nav) {
    return false;
  }
  // Review & Deploy is reached from inbound package actions, not a nav entry.
  if (isAdminActionRoute(pathname)) {
    return (
      collectionPathAllowed(nav, "/admin/deployment/inbound_packages") ||
      collectionPathAllowed(nav, "/admin/deployment/outbound_packages")
    );
  }
  return collectionPathAllowed(nav, pathname);
}

function collectionPathAllowed(nav: NavigationModel, pathname: string): boolean {
  for (const collection of nav.collections) {
    if (!isAdminCollection(collection) && !isBusinessAdminCollection(collection)) {
      continue;
    }
    if (collectionAllowsPathname(collection, pathname)) {
      return true;
    }
  }
  return false;
}

export function findCollectionForKind(
  nav: NavigationModel | null | undefined,
  kind: CollectionKind,
): NavigationModel["collections"][number] | undefined {
  if (!nav) return undefined;
  if (kind === "admin") {
    return findAdminCollection(nav.collections);
  }
  if (kind === "business_admin") {
    return findBusinessAdminCollection(nav.collections);
  }
  return undefined;
}
