import type { DisplayText, NavigationModel, NavTab } from "../api/types";
import { entriesFromCollection, findAdminCollection } from "./navCollection";

/** Stable keys for Configuration Components (Veeva content_setup peers). */
export type ConfigComponentKey =
  | "objects"
  | "object-lifecycles"
  | "workflows"
  | "picklists"
  | "layouts"
  | "config-diagnostics";

export type ConfigComponentGroup = "object_setup" | "business_logic" | "tooling";

export type ConfigComponentDef = {
  key: ConfigComponentKey;
  route: string;
  apiName: string;
  group: ConfigComponentGroup;
  defaultLabel: string;
};

/** Static catalog of implemented Configuration components (hub + sidebar). */
export const CONFIGURATION_COMPONENTS: ConfigComponentDef[] = [
  {
    key: "objects",
    route: "/admin/configuration/objects",
    apiName: "platform_admin_configuration_objects__v",
    group: "object_setup",
    defaultLabel: "Objects",
  },
  {
    key: "object-lifecycles",
    route: "/admin/configuration/object-lifecycles",
    apiName: "platform_admin_configuration_object_lifecycles__v",
    group: "business_logic",
    defaultLabel: "Object Lifecycles",
  },
  {
    key: "workflows",
    route: "/admin/configuration/workflows",
    apiName: "platform_admin_configuration_workflows__v",
    group: "business_logic",
    defaultLabel: "Workflows",
  },
  {
    key: "picklists",
    route: "/admin/configuration/picklists",
    apiName: "platform_admin_configuration_picklists__v",
    group: "object_setup",
    defaultLabel: "Picklists",
  },
  {
    key: "layouts",
    route: "/admin/configuration/layouts",
    apiName: "platform_admin_configuration_layouts__v",
    group: "object_setup",
    defaultLabel: "Page Layouts",
  },
  {
    key: "config-diagnostics",
    route: "/admin/configuration/config-diagnostics",
    apiName: "platform_admin_configuration_diagnostics__v",
    group: "tooling",
    defaultLabel: "Configuration Diagnostics",
  },
];

export const CONFIG_GROUP_ORDER: ConfigComponentGroup[] = [
  "object_setup",
  "business_logic",
  "tooling",
];

export const CONFIG_GROUP_LABELS: Record<ConfigComponentGroup, string> = {
  object_setup: "Object Setup",
  business_logic: "Business Logic",
  tooling: "Tooling",
};

const CONFIG_PARENT_API = "platform_admin_configuration__v";
const RECENT_LIMIT = 8;

export type ConfigComponent = ConfigComponentDef & {
  label: DisplayText;
};

function normalizeRoute(route: string): string {
  return route.startsWith("/") ? route : `/${route}`;
}

function findConfigurationTab(nav: NavigationModel | null | undefined): NavTab | null {
  if (!nav) return null;
  const collection = findAdminCollection(nav.collections);
  if (!collection) return null;
  for (const entry of entriesFromCollection(collection)) {
    const tabs = entry.kind === "tab" ? [entry.tab] : entry.tabs;
    for (const tab of tabs) {
      if (tab.api_name === CONFIG_PARENT_API || tab.route === "/admin/configuration") {
        return tab;
      }
    }
  }
  return null;
}

/** Components the current user may open, merged with nav labels when present. */
export function visibleConfigurationComponents(
  nav: NavigationModel | null | undefined,
): ConfigComponent[] {
  const tab = findConfigurationTab(nav);
  if (!tab) return [];
  const subtabs = tab.subtabs ?? [];
  if (subtabs.length === 0) return [];

  const allowed = new Map<string, NavTab>();
  for (const sub of subtabs) {
    if (sub.api_name) allowed.set(sub.api_name, sub);
    if (sub.route) allowed.set(normalizeRoute(sub.route), sub);
  }

  const out: ConfigComponent[] = [];
  for (const def of CONFIGURATION_COMPONENTS) {
    const fromNav = allowed.get(def.apiName) ?? allowed.get(def.route);
    if (!fromNav) continue;
    out.push({
      ...def,
      label: fromNav.label ?? { text: def.defaultLabel, fallback_source: "base_language" },
    });
  }
  return out;
}

export function isConfigurationPath(pathname: string): boolean {
  return pathname === "/admin/configuration" || pathname.startsWith("/admin/configuration/");
}

export function matchConfigurationComponent(
  pathname: string,
  components: ConfigComponent[],
): ConfigComponent | null {
  let best: ConfigComponent | null = null;
  for (const c of components) {
    if (pathname === c.route || pathname.startsWith(`${c.route}/`)) {
      if (!best || c.route.length > best.route.length) {
        best = c;
      }
    }
  }
  return best;
}

function storageKey(kind: "recent" | "favorites", vaultId: string): string {
  return `vivarcus.config.${kind}.${vaultId}`;
}

function readKeys(kind: "recent" | "favorites", vaultId: string): ConfigComponentKey[] {
  if (!vaultId || typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(kind, vaultId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const known = new Set(CONFIGURATION_COMPONENTS.map((c) => c.key));
    return parsed.filter((k): k is ConfigComponentKey => typeof k === "string" && known.has(k as ConfigComponentKey));
  } catch {
    return [];
  }
}

function writeKeys(kind: "recent" | "favorites", vaultId: string, keys: ConfigComponentKey[]): void {
  if (!vaultId || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(storageKey(kind, vaultId), JSON.stringify(keys));
  } catch {
    // ignore quota / private mode
  }
}

export function readRecentComponentKeys(vaultId: string): ConfigComponentKey[] {
  return readKeys("recent", vaultId);
}

export function readFavoriteComponentKeys(vaultId: string): ConfigComponentKey[] {
  return readKeys("favorites", vaultId);
}

export function recordConfigurationRecent(vaultId: string, key: ConfigComponentKey): ConfigComponentKey[] {
  const next = [key, ...readRecentComponentKeys(vaultId).filter((k) => k !== key)].slice(0, RECENT_LIMIT);
  writeKeys("recent", vaultId, next);
  return next;
}

export function toggleConfigurationFavorite(vaultId: string, key: ConfigComponentKey): ConfigComponentKey[] {
  const current = readFavoriteComponentKeys(vaultId);
  const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
  writeKeys("favorites", vaultId, next);
  return next;
}

export function resolveComponentsByKeys(
  keys: ConfigComponentKey[],
  components: ConfigComponent[],
): ConfigComponent[] {
  const byKey = new Map(components.map((c) => [c.key, c]));
  return keys.map((k) => byKey.get(k)).filter((c): c is ConfigComponent => Boolean(c));
}
