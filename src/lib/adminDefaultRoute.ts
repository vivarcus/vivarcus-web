import type { NavigationModel, NavTab } from "../api/types";
import {
  entriesFromCollection,
  findAdminCollection,
  firstTabInCollection,
} from "./navCollection";
import { primaryNavTab } from "./navTabUtils";
import { tabHref } from "./tabHref";

function normalizeRoute(route: string | undefined): string {
  if (!route) return "";
  return route.startsWith("/") ? route : `/${route}`;
}

/** Strips a parent admin route prefix for nested <Navigate to="..."> targets. */
export function adminChildPath(parentRoute: string, absoluteHref: string): string {
  const prefix = `${normalizeRoute(parentRoute)}/`;
  if (absoluteHref.startsWith(prefix)) {
    return absoluteHref.slice(prefix.length);
  }
  return absoluteHref.replace(/^\//, "");
}

function findAdminTab(nav: NavigationModel, parentRoute: string): NavTab | undefined {
  const admin = findAdminCollection(nav.collections);
  if (!admin) return undefined;
  const normalizedParent = normalizeRoute(parentRoute);
  for (const entry of entriesFromCollection(admin)) {
    if (entry.kind !== "tab") continue;
    if (normalizeRoute(entry.tab.route) === normalizedParent) {
      return entry.tab;
    }
  }
  return undefined;
}

/** Resolves the first visible admin landing href, optionally scoped to one parent tab. */
export function resolveAdminDefaultHref(
  nav: NavigationModel | null | undefined,
  parentRoute?: string,
): string | null {
  if (!nav) return null;
  if (parentRoute) {
    const tab = findAdminTab(nav, parentRoute);
    if (!tab) return null;
    return tabHref("", primaryNavTab(tab));
  }
  const admin = findAdminCollection(nav.collections);
  if (!admin) return null;
  return firstTabInCollection("", admin) ?? null;
}
