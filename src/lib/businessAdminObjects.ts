import type { BusinessAdminObjectOption, BusinessAdminObjectsSelectorModel } from "../api/types";
import { displayText } from "./i18n";

/** Saved View / list preference scope for Business Admin > Objects. */
export const BUSINESS_ADMIN_OBJECTS_ENTRY_CONTEXT = "business_admin_objects";

export const BUSINESS_ADMIN_OBJECTS_HOME = "business-admin/objects";

export const BUSINESS_ADMIN_OBJECTS_PAGE_SIZE = 25;

export type ObjectSourceKind = BusinessAdminObjectOption["source"];

const RECENT_KEY = "vivarcus:business-admin-objects:recent";
const FAVORITES_KEY = "vivarcus:business-admin-objects:favorites";

function storageKey(vaultId: string, suffix: string): string {
  return `${suffix}:${vaultId}`;
}

export function filterBusinessAdminObjects(
  objects: BusinessAdminObjectOption[],
  query: string,
): BusinessAdminObjectOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return objects;
  return objects.filter(
    (obj) =>
      obj.api_name.toLowerCase().includes(q) ||
      obj.label.text.toLowerCase().includes(q) ||
      obj.label_plural.text.toLowerCase().includes(q) ||
      sourceLabel(obj.source).toLowerCase().includes(q),
  );
}

export function sourceLabel(source: ObjectSourceKind): string {
  switch (source) {
    case "standard":
      return "Standard";
    case "system":
      return "System";
    case "custom":
      return "Custom";
    case "application":
      return "Application";
    default:
      return source;
  }
}

export function localizedSourceLabel(
  source: ObjectSourceKind,
  chrome?: BusinessAdminObjectsSelectorModel["chrome"],
): string {
  switch (source) {
    case "standard":
      return displayText(chrome?.source_standard, "Standard");
    case "system":
      return displayText(chrome?.source_system, "System");
    case "custom":
      return displayText(chrome?.source_custom, "Custom");
    case "application":
      return displayText(chrome?.source_application, "Application");
    default:
      return source;
  }
}

export function paginateBusinessAdminObjects<T>(items: T[], page: number, pageSize: number): T[] {
  const start = Math.max(0, page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function readRecentBusinessAdminObjects(vaultId: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey(vaultId, RECENT_KEY));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function rememberBusinessAdminObject(vaultId: string, apiName: string): void {
  const current = readRecentBusinessAdminObjects(vaultId).filter((item) => item !== apiName);
  current.unshift(apiName);
  localStorage.setItem(storageKey(vaultId, RECENT_KEY), JSON.stringify(current.slice(0, 8)));
}

export function readFavoriteBusinessAdminObjects(vaultId: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey(vaultId, FAVORITES_KEY));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function toggleFavoriteBusinessAdminObject(vaultId: string, apiName: string): string[] {
  const current = readFavoriteBusinessAdminObjects(vaultId);
  const next = current.includes(apiName)
    ? current.filter((item) => item !== apiName)
    : [...current, apiName];
  localStorage.setItem(storageKey(vaultId, FAVORITES_KEY), JSON.stringify(next));
  return next;
}

export function resolveBusinessAdminObjectLinks(
  objects: BusinessAdminObjectOption[],
  apiNames: string[],
): BusinessAdminObjectOption[] {
  const byName = new Map(objects.map((obj) => [obj.api_name, obj]));
  return apiNames.map((apiName) => byName.get(apiName)).filter(Boolean) as BusinessAdminObjectOption[];
}
