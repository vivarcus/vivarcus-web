import type {
  MetadataPermissionSetCategory,
  MetadataPermissionSetEntry,
  MetadataPermissionSetObjectSummary,
  MetadataPermissionSetObjectTypeSummary,
  MetadataPermissionSetTabSummary,
  MetadataPermissionSetTabSubSummary,
} from "../api/types";

// Pure view helpers for the permission set detail page. Kept separate from the React
// component so the grouping / classification / filtering logic is unit-testable and the
// component stays presentational.

// ObjectEntryGroup is the set of permission entries that share the same object name
// (the second segment of an `object.<obj>.<rest>` key).
export interface ObjectEntryGroup {
  objectName: string;
  entries: MetadataPermissionSetEntry[];
}

// humanizeApiName turns a component api_name into a readable display fallback when no configured
// label is available: it drops a trailing namespace suffix (e.g. __v / __c / __sys / __ctms),
// splits on underscores/dots, and title-cases each word. E.g. "study_country__v" -> "Study
// Country". Returns the original name when it has no humanizable content (so nothing is lost).
export function humanizeApiName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return name;
  const stripped = trimmed.replace(/__[a-z0-9]+$/i, "");
  const words = stripped.split(/[_.]+/).filter(Boolean);
  if (words.length === 0) return name;
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

// objectNameOfKey extracts the object name (2nd segment) from an `object.<obj>.<rest>` key.
// Falls back to "<unknown>" when the shape is unexpected.
export function objectNameOfKey(key: string): string {
  const rest = key.startsWith("object.") ? key.slice("object.".length) : key;
  const dot = rest.indexOf(".");
  return dot === -1 ? "<unknown>" : rest.slice(0, dot);
}

// objectEntryTail strips the `object.<obj>.` prefix from a key, leaving the permission tail
// (e.g. "object_actions", "field_actions", "base__v.object_actions",
// "create_site_budget_records__c.actions"). Returns the whole key when the shape is unexpected.
export function objectEntryTail(key: string, objectName: string): string {
  const prefix = `object.${objectName}.`;
  return key.startsWith(prefix) ? key.slice(prefix.length) : key;
}

// PermissionKind is the semantic classification of one object permission entry, derived from
// its key tail. It lets the viewer render a readable label instead of the raw dotted suffix.
export type PermissionKind =
  | { kind: "object" }
  | { kind: "controls" }
  | { kind: "fields" }
  | { kind: "field"; name: string }
  | { kind: "object_type"; name: string }
  | { kind: "record_action"; name: string }
  | { kind: "other"; raw: string };

// classifyObjectEntry maps an `object.<obj>.<tail>` key to a PermissionKind:
//   object_actions                 -> object       (record CRUD on the object)
//   controls                       -> controls     (page-layout controls)
//   field_actions                  -> fields       (object-wide field read/edit default)
//   <field>.field_actions          -> field        (per-field read/edit)
//   <type>.object_actions          -> object_type  (per object-type CRUD)
//   <recordaction>.actions         -> record_action(execute/view of a record action)
// Anything else falls back to "other" carrying the raw tail so nothing is misrepresented.
export function classifyObjectEntry(key: string, objectName: string): PermissionKind {
  const tail = objectEntryTail(key, objectName);
  if (tail === key) return { kind: "other", raw: key };
  if (tail === "object_actions") return { kind: "object" };
  if (tail === "controls") return { kind: "controls" };
  if (tail === "field_actions") return { kind: "fields" };
  const segments = tail.split(".");
  if (segments.length === 2 && segments[1] === "object_actions") {
    return { kind: "object_type", name: segments[0] };
  }
  if (segments.length === 2 && segments[1] === "field_actions") {
    return { kind: "field", name: segments[0] };
  }
  if (segments.length === 2 && segments[1] === "actions") {
    return { kind: "record_action", name: segments[0] };
  }
  return { kind: "other", raw: tail };
}

// permissionKindRank orders entries within an object group so the most important rows
// (object CRUD, then fields/controls, then per-type, then record actions) come first.
export function permissionKindRank(kind: PermissionKind): number {
  switch (kind.kind) {
    case "object":
      return 0;
    case "fields":
      return 1;
    case "field":
      return 2;
    case "controls":
      return 3;
    case "object_type":
      return 4;
    case "record_action":
      return 5;
    default:
      return 6;
  }
}

// groupObjectsEntries buckets the Objects category entries by object name, sorts groups by
// name, and sorts each group's entries by (kind rank, key) so the object-level row leads.
export function groupObjectsEntries(
  entries: MetadataPermissionSetEntry[],
): ObjectEntryGroup[] {
  const byName = new Map<string, MetadataPermissionSetEntry[]>();
  for (const entry of entries) {
    const objectName = objectNameOfKey(entry.key);
    const bucket = byName.get(objectName);
    if (bucket) bucket.push(entry);
    else byName.set(objectName, [entry]);
  }
  const groups = Array.from(byName, ([objectName, ents]) => ({
    objectName,
    entries: sortObjectEntries(objectName, ents),
  }));
  groups.sort((a, b) => a.objectName.localeCompare(b.objectName));
  return groups;
}

function sortObjectEntries(
  objectName: string,
  entries: MetadataPermissionSetEntry[],
): MetadataPermissionSetEntry[] {
  return [...entries].sort((a, b) => {
    const ra = permissionKindRank(classifyObjectEntry(a.key, objectName));
    const rb = permissionKindRank(classifyObjectEntry(b.key, objectName));
    if (ra !== rb) return ra - rb;
    return a.key.localeCompare(b.key);
  });
}

// OBJECT_CRUD_ACTIONS is the Veeva Objects-tab column order (Read / Create / Edit / Delete) used
// for the permission matrix and compact CRUD badges.
export const OBJECT_CRUD_ACTIONS = ["read", "create", "edit", "delete"] as const;

// objectLevelActions returns the granted actions on the group's `object_actions` entry
// (the record-level CRUD grant), or an empty array when the group grants none. Used to render
// a scannable summary in the object header without expanding the panel.
export function objectLevelActions(group: ObjectEntryGroup): string[] {
  const entry = group.entries.find(
    (e) => classifyObjectEntry(e.key, group.objectName).kind === "object",
  );
  return entry?.actions ?? [];
}

// entryMatchesQuery reports whether an entry matches a (case-insensitive) query on its key,
// any granted action, or any available (candidate) action. Matching available_actions lets
// administrators find withheld Application/Admin capabilities in the full-catalog matrix.
// An empty query always matches.
export function entryMatchesQuery(entry: MetadataPermissionSetEntry, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (entry.key.toLowerCase().includes(q)) return true;
  if (entry.actions.some((a) => a.toLowerCase().includes(q))) return true;
  return (entry.available_actions ?? []).some((a) => a.toLowerCase().includes(q));
}

// filterObjectGroups narrows object groups to those whose object name matches the query, or
// that contain at least one matching entry (in which case only the matching entries are kept).
// An empty query returns all groups unchanged.
export function filterObjectGroups(
  groups: ObjectEntryGroup[],
  query: string,
): ObjectEntryGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return groups;
  return groups
    .map((g) => {
      if (g.objectName.toLowerCase().includes(q)) return g;
      const matched = g.entries.filter((e) => entryMatchesQuery(e, q));
      return matched.length > 0 ? { objectName: g.objectName, entries: matched } : null;
    })
    .filter((g): g is ObjectEntryGroup => g !== null);
}

// filterFlatEntries narrows a non-Objects category's entries to those matching the query.
export function filterFlatEntries(
  entries: MetadataPermissionSetEntry[],
  query: string,
): MetadataPermissionSetEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;
  return entries.filter((e) => entryMatchesQuery(e, q));
}

// CapabilitySectionId is a Veeva Admin / Application tab section heading. Keys are bucketed into
// these sections so the viewer can render titled groups instead of a flat capability list.
export type CapabilitySectionId =
  | "security"
  | "configuration"
  | "settings"
  | "operations"
  | "domain_administration"
  | "deployment"
  | "vault_actions"
  | "vault_owner_actions"
  | "vault_client_applications"
  | "other";

// CapabilitySection is one titled group of Admin / Application capability rows.
export interface CapabilitySection {
  id: CapabilitySectionId;
  entries: MetadataPermissionSetEntry[];
}

// ADMIN_SECTION_ORDER mirrors Veeva Admin-tab headings (Security → Configuration → Settings →
// Operations → Domain Administration → Deployment), with "other" last for exotic keys.
const ADMIN_SECTION_ORDER: CapabilitySectionId[] = [
  "security",
  "configuration",
  "settings",
  "operations",
  "domain_administration",
  "deployment",
  "other",
];

// APPLICATION_SECTION_ORDER mirrors Veeva Application-tab headings.
const APPLICATION_SECTION_ORDER: CapabilitySectionId[] = [
  "vault_actions",
  "vault_owner_actions",
  "vault_client_applications",
  "other",
];

// capabilitySectionOf maps a capability permission key to its Veeva section. Settings is split
// out of Configuration (configuration.settings*) to match Veeva's separate Settings heading;
// vault_loader sits under Deployment with the bare deployment key (Vivarcus Admin catalog).
export function capabilitySectionOf(key: string): CapabilitySectionId {
  if (key === "security" || key.startsWith("security.")) return "security";
  if (key === "configuration.settings" || key.startsWith("configuration.settings.")) {
    return "settings";
  }
  if (key === "configuration" || key.startsWith("configuration.")) return "configuration";
  if (key === "operations" || key.startsWith("operations.")) return "operations";
  if (key === "domain_administration" || key.startsWith("domain_administration.")) {
    return "domain_administration";
  }
  if (
    key === "deployment" ||
    key.startsWith("deployment.") ||
    key === "vault_loader" ||
    key.startsWith("vault_loader.")
  ) {
    return "deployment";
  }
  if (key === "vault_actions" || key.startsWith("vault_actions.")) return "vault_actions";
  if (key === "vault_owner_actions" || key.startsWith("vault_owner_actions.")) {
    return "vault_owner_actions";
  }
  if (key === "vault_client_applications" || key.startsWith("vault_client_applications.")) {
    return "vault_client_applications";
  }
  return "other";
}

// groupCapabilityEntries buckets Admin / Application entries into Veeva section headings, preserving
// each section's catalog order (entries arrive already ordered from the backend catalogs). Empty
// sections are omitted. Unknown category keys fall back to the Admin section order.
export function groupCapabilityEntries(
  categoryKey: string,
  entries: MetadataPermissionSetEntry[],
): CapabilitySection[] {
  const order =
    categoryKey === "application" ? APPLICATION_SECTION_ORDER : ADMIN_SECTION_ORDER;
  const buckets = new Map<CapabilitySectionId, MetadataPermissionSetEntry[]>();
  for (const entry of entries) {
    const id = capabilitySectionOf(entry.key);
    const bucket = buckets.get(id);
    if (bucket) bucket.push(entry);
    else buckets.set(id, [entry]);
  }
  return order
    .filter((id) => (buckets.get(id)?.length ?? 0) > 0)
    .map((id) => ({ id, entries: buckets.get(id)! }));
}

// filterCapabilitySections narrows section groups to those with at least one matching entry (and
// keeps only the matching rows). An empty query returns the sections unchanged.
export function filterCapabilitySections(
  sections: CapabilitySection[],
  query: string,
): CapabilitySection[] {
  const q = query.trim().toLowerCase();
  if (!q) return sections;
  return sections
    .map((s) => {
      const matched = s.entries.filter((e) => entryMatchesQuery(e, q));
      return matched.length > 0 ? { id: s.id, entries: matched } : null;
    })
    .filter((s): s is CapabilitySection => s !== null);
}

// countCategoryMatches returns how many entries in a category match the query (used for the
// per-tab match badge). For an empty query this is the category's full entry count.
export function countCategoryMatches(
  category: MetadataPermissionSetCategory,
  query: string,
): number {
  const q = query.trim().toLowerCase();
  if (!q) return category.entries.length;
  return category.entries.reduce((n, e) => n + (entryMatchesQuery(e, q) ? 1 : 0), 0);
}

// distinctObjectCount returns the number of distinct objects referenced by a category's
// entries (only meaningful for the Objects category).
export function distinctObjectCount(entries: MetadataPermissionSetEntry[]): number {
  return new Set(entries.map((e) => objectNameOfKey(e.key))).size;
}

// objectSummaryMatchesQuery reports whether an object summary matches a (case-insensitive) query
// on its api_name or label. An empty query always matches. The Objects tab lists the full object
// universe and loads each object's per-field/type/action matrix lazily, so search here filters by
// object identity only (not by the not-yet-loaded per-field grants).
export function objectSummaryMatchesQuery(
  obj: MetadataPermissionSetObjectSummary,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return obj.api_name.toLowerCase().includes(q) || obj.label.toLowerCase().includes(q);
}

// filterObjectSummaries narrows the full object list to those matching the query (by api_name or
// label), including a match on any nested object type. An empty query returns the list unchanged.
export function filterObjectSummaries(
  objects: MetadataPermissionSetObjectSummary[],
  query: string,
): MetadataPermissionSetObjectSummary[] {
  const q = query.trim().toLowerCase();
  if (!q) return objects;
  return objects.filter(
    (o) =>
      objectSummaryMatchesQuery(o, q) ||
      (o.object_types ?? []).some(
        (t) => t.api_name.toLowerCase().includes(q) || t.label.toLowerCase().includes(q),
      ),
  );
}

// ObjectsTableRow is one flattened row in the Objects tab table: either an object (parent) or an
// indented object type (child). Parent rows link to the per-object detail page; child rows carry
// the type's effective CRUD grant so wildcard / object-level rules are visible without drilling in.
export type ObjectsTableRow =
  | {
      kind: "object";
      key: string;
      object: MetadataPermissionSetObjectSummary;
    }
  | {
      kind: "object_type";
      key: string;
      objectApiName: string;
      objectLabel: string;
      type: MetadataPermissionSetObjectTypeSummary;
    };

// flattenObjectSummaries expands each object summary into a parent row plus indented object-type
// child rows (Veeva Objects tab hierarchy). Objects without types yield a single parent row.
export function flattenObjectSummaries(
  objects: MetadataPermissionSetObjectSummary[],
): ObjectsTableRow[] {
  const rows: ObjectsTableRow[] = [];
  for (const obj of objects) {
    rows.push({ kind: "object", key: obj.api_name, object: obj });
    for (const t of obj.object_types ?? []) {
      rows.push({
        kind: "object_type",
        key: `${obj.api_name}:${t.api_name}`,
        objectApiName: obj.api_name,
        objectLabel: obj.label || obj.api_name,
        type: t,
      });
    }
  }
  return rows;
}

// rowVisibleForObjectType reports whether a per-object permission row is shown for the selected
// object type in the per-object detail's "All Object Types" filter. An empty selection shows every
// row. The section-wide default row and rows with no type membership (empty object_types = applies
// to all types, e.g. controls we can't scope) always stay visible; otherwise the row is shown only
// when its object_types include the selected type.
export function rowVisibleForObjectType(
  row: { is_default?: boolean; object_types?: string[] },
  selectedType: string,
): boolean {
  if (!selectedType) return true;
  if (row.is_default) return true;
  if (!row.object_types || row.object_types.length === 0) return true;
  return row.object_types.includes(selectedType);
}

// TAB_VIEW_ACTION is the single action column on the Tabs permission matrix (Veeva Tabs tab).
export const TAB_VIEW_ACTION = "view" as const;

// ParsedTabKey is the structural parse of a Tabs-category permission key.
export type ParsedTabKey =
  | { kind: "tab"; apiName: string }
  | { kind: "subtab"; collection: string; apiName: string }
  | { kind: "tab_collection"; apiName: string }
  | { kind: "other"; key: string };

// parseTabEntryKey classifies a Tabs-category permission key:
//   tab.<name>.tab_actions                         → top-level tab
//   tab.<collection>.<subtab>.tab_actions           → subtab under a collection
//   tab_collection.<name>.tab_collection_actions    → tab-collection grant
// Anything else falls back to "other" so exotic keys still render.
export function parseTabEntryKey(key: string): ParsedTabKey {
  if (key.startsWith("tab_collection.") && key.endsWith(".tab_collection_actions")) {
    const apiName = key.slice("tab_collection.".length, -".tab_collection_actions".length);
    if (apiName && !apiName.includes(".")) return { kind: "tab_collection", apiName };
  }
  if (key.startsWith("tab.") && key.endsWith(".tab_actions")) {
    const mid = key.slice("tab.".length, -".tab_actions".length);
    const segments = mid.split(".").filter(Boolean);
    if (segments.length === 1) return { kind: "tab", apiName: segments[0] };
    if (segments.length === 2) {
      return { kind: "subtab", collection: segments[0], apiName: segments[1] };
    }
  }
  return { kind: "other", key };
}

// TabGroup is one top-level Tabs-tab row (a standalone tab or a collection) plus any nested
// subtab grants. Mirrors Veeva's Tabs hierarchy.
export interface TabGroup {
  apiName: string;
  label: string;
  actions: string[];
  availableActions: string[];
  // entryKey is the permission key that granted the parent row itself (empty when the parent
  // exists only as a grouping container for subtabs).
  entryKey: string;
  subtabs: Array<{
    apiName: string;
    label: string;
    actions: string[];
    availableActions: string[];
    entryKey: string;
  }>;
}

// tabEntryLabel resolves a human label for a tab / subtab / collection: prefer the backend
// entry_labels map, otherwise humanize the api_name. Never falls back to the "Tab · …" capability
// vocabulary — that is for Admin/Application keys, not named Tab components.
export function tabEntryLabel(
  entryKey: string,
  apiName: string,
  entryLabels: Record<string, string>,
): string {
  return entryLabels[entryKey] || humanizeApiName(apiName);
}

// groupTabEntries buckets Tabs-category entries into collection/standalone groups with nested
// subtabs, sorted by parent then subtab label. Wildcard / exotic keys that do not parse as a
// tab/subtab/collection become standalone groups keyed by the raw permission key.
export function groupTabEntries(
  entries: MetadataPermissionSetEntry[],
  entryLabels: Record<string, string>,
): TabGroup[] {
  const byParent = new Map<string, TabGroup>();

  const ensureParent = (apiName: string, label: string): TabGroup => {
    let g = byParent.get(apiName);
    if (!g) {
      g = {
        apiName,
        label,
        actions: [],
        availableActions: ["view"],
        entryKey: "",
        subtabs: [],
      };
      byParent.set(apiName, g);
    }
    return g;
  };

  for (const entry of entries) {
    const parsed = parseTabEntryKey(entry.key);
    switch (parsed.kind) {
      case "tab":
      case "tab_collection": {
        const label = tabEntryLabel(entry.key, parsed.apiName, entryLabels);
        const g = ensureParent(parsed.apiName, label);
        g.label = label;
        g.actions = entry.actions;
        g.availableActions = entry.available_actions?.length
          ? entry.available_actions
          : ["view"];
        g.entryKey = entry.key;
        break;
      }
      case "subtab": {
        const parentLabel =
          entryLabels[`tab.${parsed.collection}`] || humanizeApiName(parsed.collection);
        const g = ensureParent(parsed.collection, parentLabel);
        g.subtabs.push({
          apiName: parsed.apiName,
          label: tabEntryLabel(entry.key, parsed.apiName, entryLabels),
          actions: entry.actions,
          availableActions: entry.available_actions?.length ? entry.available_actions : ["view"],
          entryKey: entry.key,
        });
        break;
      }
      default: {
        const label = entryLabels[entry.key] || humanizeApiName(entry.key);
        const g = ensureParent(entry.key, label);
        g.actions = entry.actions;
        g.availableActions = entry.available_actions?.length
          ? entry.available_actions
          : ["view"];
        g.entryKey = entry.key;
        break;
      }
    }
  }

  for (const g of byParent.values()) {
    g.subtabs.sort((a, b) => a.label.localeCompare(b.label) || a.apiName.localeCompare(b.apiName));
  }
  return Array.from(byParent.values()).sort(
    (a, b) => a.label.localeCompare(b.label) || a.apiName.localeCompare(b.apiName),
  );
}

// TabsTableRow is one flattened row in the Tabs matrix: a top-level tab/collection or an indented
// subtab (Veeva Tabs tab hierarchy), backed by the full-universe summaries from the API.
export type TabsTableRow =
  | { kind: "tab"; key: string; tab: MetadataPermissionSetTabSummary }
  | {
      kind: "subtab";
      key: string;
      parentApiName: string;
      parentLabel: string;
      subtab: MetadataPermissionSetTabSubSummary;
    };

// flattenTabSummaries expands each tab summary into a parent row plus indented subtab children.
export function flattenTabSummaries(tabs: MetadataPermissionSetTabSummary[]): TabsTableRow[] {
  const rows: TabsTableRow[] = [];
  for (const tab of tabs) {
    rows.push({ kind: "tab", key: tab.api_name, tab });
    for (const s of tab.subtabs ?? []) {
      rows.push({
        kind: "subtab",
        key: `${tab.api_name}:${s.api_name}`,
        parentApiName: tab.api_name,
        parentLabel: tab.label || tab.api_name,
        subtab: s,
      });
    }
  }
  return rows;
}

// filterTabSummaries narrows the full tab universe by query on parent/subtab label or api_name.
// Matching a subtab keeps the parent and only the matching children; matching the parent keeps
// all children. An empty query returns the list unchanged.
export function filterTabSummaries(
  tabs: MetadataPermissionSetTabSummary[],
  query: string,
): MetadataPermissionSetTabSummary[] {
  const q = query.trim().toLowerCase();
  if (!q) return tabs;
  return tabs
    .map((tab) => {
      const parentHit =
        tab.api_name.toLowerCase().includes(q) || tab.label.toLowerCase().includes(q);
      if (parentHit) return tab;
      const matched = (tab.subtabs ?? []).filter(
        (s) => s.api_name.toLowerCase().includes(q) || s.label.toLowerCase().includes(q),
      );
      return matched.length > 0 ? { ...tab, subtabs: matched } : null;
    })
    .filter((t): t is MetadataPermissionSetTabSummary => t !== null);
}

// countTabSummaryMatches returns how many flattened tab/subtab rows match the query (for the Tabs
// tab badge). An empty query counts every parent and subtab row.
export function countTabSummaryMatches(
  tabs: MetadataPermissionSetTabSummary[],
  query: string,
): number {
  const filtered = filterTabSummaries(tabs, query);
  return filtered.reduce((n, t) => n + 1 + (t.subtabs?.length ?? 0), 0);
}

function tabGroupToSummary(g: TabGroup): MetadataPermissionSetTabSummary {
  return {
    api_name: g.apiName,
    label: g.label,
    actions: g.actions,
    available_actions: g.availableActions,
    subtabs: g.subtabs.map((s) => ({
      api_name: s.apiName,
      label: s.label,
      actions: s.actions,
      available_actions: s.availableActions,
    })),
  };
}

// flattenTabGroups expands grant-derived TabGroups into the same flattened row shape used by the
// universe path (kept for unit tests of groupTabEntries).
export function flattenTabGroups(groups: TabGroup[]): TabsTableRow[] {
  return flattenTabSummaries(groups.map(tabGroupToSummary));
}

// filterTabGroups narrows grant-derived tab groups by query (unit-test helper).
export function filterTabGroups(groups: TabGroup[], query: string): TabGroup[] {
  const filtered = filterTabSummaries(groups.map(tabGroupToSummary), query);
  const byName = new Map(groups.map((g) => [g.apiName, g]));
  return filtered.map((t) => {
    const orig = byName.get(t.api_name)!;
    const keep = new Set((t.subtabs ?? []).map((s) => s.api_name));
    return {
      ...orig,
      subtabs: orig.subtabs.filter((s) => keep.has(s.apiName)),
    };
  });
}

// countTabGroupMatches returns how many flattened rows match for grant-derived groups.
export function countTabGroupMatches(groups: TabGroup[], query: string): number {
  return countTabSummaryMatches(groups.map(tabGroupToSummary), query);
}
