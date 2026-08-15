import { describe, expect, it } from "vitest";
import type {
  MetadataPermissionSetCategory,
  MetadataPermissionSetEntry,
  MetadataPermissionSetObjectSummary,
} from "../api/types";
import {
  classifyObjectEntry,
  countCategoryMatches,
  distinctObjectCount,
  entryMatchesQuery,
  filterFlatEntries,
  filterObjectGroups,
  filterObjectSummaries,
  filterTabGroups,
  flattenObjectSummaries,
  flattenTabGroups,
  groupCapabilityEntries,
  capabilitySectionOf,
  groupObjectsEntries,
  groupTabEntries,
  humanizeApiName,
  objectEntryTail,
  objectLevelActions,
  objectNameOfKey,
  objectSummaryMatchesQuery,
  parseTabEntryKey,
  permissionKindRank,
  rowVisibleForObjectType,
} from "./permissionSetView";

function entry(key: string, actions: string[] = []): MetadataPermissionSetEntry {
  return { key, actions, available_actions: [] };
}

function objectSummary(
  api_name: string,
  label: string,
  object_types: MetadataPermissionSetObjectSummary["object_types"] = [],
): MetadataPermissionSetObjectSummary {
  return { api_name, label, source: "custom", actions: [], available_actions: [], object_types };
}

describe("humanizeApiName", () => {
  it("strips the namespace suffix and title-cases the words", () => {
    expect(humanizeApiName("study_country__v")).toBe("Study Country");
    expect(humanizeApiName("create_site_budget__c")).toBe("Create Site Budget");
    expect(humanizeApiName("dashboards__sys")).toBe("Dashboards");
  });
  it("handles names without a suffix or separators", () => {
    expect(humanizeApiName("home")).toBe("Home");
    expect(humanizeApiName("")).toBe("");
  });
});

describe("objectNameOfKey", () => {
  it("extracts the object segment", () => {
    expect(objectNameOfKey("object.study__v.object_actions")).toBe("study__v");
    expect(objectNameOfKey("object.budget__v.create_items__c.actions")).toBe("budget__v");
  });
  it("falls back to <unknown> when there is no name segment", () => {
    expect(objectNameOfKey("object.study__v")).toBe("<unknown>");
    expect(objectNameOfKey("object")).toBe("<unknown>");
  });
});

describe("objectEntryTail", () => {
  it("strips the object.<obj>. prefix", () => {
    expect(objectEntryTail("object.study__v.object_actions", "study__v")).toBe("object_actions");
    expect(objectEntryTail("object.study__v.base__v.object_actions", "study__v")).toBe(
      "base__v.object_actions",
    );
  });
  it("returns the whole key for unexpected shapes", () => {
    expect(objectEntryTail("security.users", "study__v")).toBe("security.users");
  });
});

describe("classifyObjectEntry", () => {
  const obj = "study__v";
  it("classifies object-level CRUD", () => {
    expect(classifyObjectEntry("object.study__v.object_actions", obj)).toEqual({ kind: "object" });
  });
  it("classifies controls and fields", () => {
    expect(classifyObjectEntry("object.study__v.controls", obj)).toEqual({ kind: "controls" });
    expect(classifyObjectEntry("object.study__v.field_actions", obj)).toEqual({ kind: "fields" });
  });
  it("classifies per-field FLS with the field name", () => {
    expect(classifyObjectEntry("object.study__v.study_country__v.field_actions", obj)).toEqual({
      kind: "field",
      name: "study_country__v",
    });
  });
  it("classifies per-object-type CRUD", () => {
    expect(classifyObjectEntry("object.study__v.base__v.object_actions", obj)).toEqual({
      kind: "object_type",
      name: "base__v",
    });
  });
  it("classifies record actions", () => {
    expect(classifyObjectEntry("object.study__v.create_site_budget__c.actions", obj)).toEqual({
      kind: "record_action",
      name: "create_site_budget__c",
    });
  });
  it("falls back to other for unexpected tails", () => {
    expect(classifyObjectEntry("object.study__v.a.b.c", obj)).toEqual({ kind: "other", raw: "a.b.c" });
    expect(classifyObjectEntry("security.users", obj)).toEqual({ kind: "other", raw: "security.users" });
  });
});

describe("groupObjectsEntries", () => {
  it("groups by object, sorts groups, and orders entries by kind rank", () => {
    const groups = groupObjectsEntries([
      entry("object.study__v.create_x__c.actions", ["execute"]),
      entry("object.study__v.field_actions", ["read"]),
      entry("object.study__v.object_actions", ["read", "create"]),
      entry("object.activity__v.object_actions", ["read"]),
    ]);
    expect(groups.map((g) => g.objectName)).toEqual(["activity__v", "study__v"]);
    // study group: object (rank 0) before fields (1) before record_action (4)
    const studyKinds = groups[1].entries.map((e) => classifyObjectEntry(e.key, "study__v").kind);
    expect(studyKinds).toEqual(["object", "fields", "record_action"]);
  });
});

describe("permissionKindRank", () => {
  it("ranks object first and other last", () => {
    expect(permissionKindRank({ kind: "object" })).toBeLessThan(
      permissionKindRank({ kind: "fields" }),
    );
    expect(permissionKindRank({ kind: "other", raw: "x" })).toBe(6);
  });
});

describe("objectLevelActions", () => {
  it("returns the object_actions grant", () => {
    const group = {
      objectName: "study__v",
      entries: [
        entry("object.study__v.object_actions", ["read", "create", "edit"]),
        entry("object.study__v.field_actions", ["read"]),
      ],
    };
    expect(objectLevelActions(group)).toEqual(["read", "create", "edit"]);
  });
  it("returns empty when there is no object-level entry", () => {
    const group = {
      objectName: "study__v",
      entries: [entry("object.study__v.field_actions", ["read"])],
    };
    expect(objectLevelActions(group)).toEqual([]);
  });
});

describe("entryMatchesQuery", () => {
  it("matches on key or action, case-insensitively", () => {
    const e = entry("object.study__v.object_actions", ["read", "create"]);
    expect(entryMatchesQuery(e, "STUDY")).toBe(true);
    expect(entryMatchesQuery(e, "create")).toBe(true);
    expect(entryMatchesQuery(e, "delete")).toBe(false);
    expect(entryMatchesQuery(e, "  ")).toBe(true);
  });

  it("matches available (ungranted) actions so withheld catalog rows are searchable", () => {
    const e: MetadataPermissionSetEntry = {
      key: "vault_actions.workflow",
      actions: ["start"],
      available_actions: ["start", "e_sig", "read_understand", "participate", "all_workflow"],
    };
    expect(entryMatchesQuery(e, "participate")).toBe(true);
    expect(entryMatchesQuery(e, "bulk_delete")).toBe(false);
  });
});

describe("filterObjectGroups", () => {
  const groups = groupObjectsEntries([
    entry("object.study__v.object_actions", ["read"]),
    entry("object.study__v.field_actions", ["edit"]),
    entry("object.activity__v.object_actions", ["read"]),
  ]);
  it("returns all groups for an empty query", () => {
    expect(filterObjectGroups(groups, "")).toHaveLength(2);
  });
  it("keeps whole group when object name matches", () => {
    const out = filterObjectGroups(groups, "study");
    expect(out).toHaveLength(1);
    expect(out[0].entries).toHaveLength(2);
  });
  it("keeps only matching entries when only entries match", () => {
    const out = filterObjectGroups(groups, "edit");
    expect(out).toHaveLength(1);
    expect(out[0].objectName).toBe("study__v");
    expect(out[0].entries).toHaveLength(1);
  });
});

describe("filterFlatEntries", () => {
  const entries = [entry("security.users", ["read"]), entry("configuration.settings", ["read", "edit"])];
  it("filters by key or action", () => {
    expect(filterFlatEntries(entries, "config")).toHaveLength(1);
    expect(filterFlatEntries(entries, "edit")).toHaveLength(1);
    expect(filterFlatEntries(entries, "")).toHaveLength(2);
  });
});

describe("countCategoryMatches", () => {
  const category: MetadataPermissionSetCategory = {
    key: "admin",
    label: "Admin",
    order: 0,
    entries: [entry("security.users", ["read"]), entry("configuration.settings", ["read"])],
  };
  it("counts full entries for empty query", () => {
    expect(countCategoryMatches(category, "")).toBe(2);
  });
  it("counts matching entries for a query", () => {
    expect(countCategoryMatches(category, "security")).toBe(1);
  });
});

describe("distinctObjectCount", () => {
  it("counts distinct objects", () => {
    expect(
      distinctObjectCount([
        entry("object.study__v.object_actions"),
        entry("object.study__v.field_actions"),
        entry("object.activity__v.object_actions"),
      ]),
    ).toBe(2);
  });
});

describe("objectSummaryMatchesQuery", () => {
  const study = objectSummary("study__v", "Study");
  it("matches on api_name or label, case-insensitively", () => {
    expect(objectSummaryMatchesQuery(study, "STUDY")).toBe(true);
    expect(objectSummaryMatchesQuery(study, "study__v")).toBe(true);
    expect(objectSummaryMatchesQuery(study, "activity")).toBe(false);
    expect(objectSummaryMatchesQuery(study, "  ")).toBe(true);
  });
});

describe("rowVisibleForObjectType", () => {
  it("shows every row when no type is selected", () => {
    expect(rowVisibleForObjectType({ object_types: ["base__v"] }, "")).toBe(true);
  });
  it("always shows the default row and untyped rows", () => {
    expect(rowVisibleForObjectType({ is_default: true }, "base__v")).toBe(true);
    expect(rowVisibleForObjectType({ object_types: [] }, "base__v")).toBe(true);
    expect(rowVisibleForObjectType({}, "base__v")).toBe(true);
  });
  it("shows a typed row only when its types include the selection", () => {
    expect(rowVisibleForObjectType({ object_types: ["base__v"] }, "base__v")).toBe(true);
    expect(rowVisibleForObjectType({ object_types: ["interventional__v"] }, "base__v")).toBe(false);
  });
});

describe("filterObjectSummaries", () => {
  const objects = [
    objectSummary("study__v", "Study", [
      { api_name: "base__v", label: "Base Study", actions: ["read"], available_actions: [] },
    ]),
    objectSummary("activity__v", "Activity"),
    objectSummary("study_country__v", "Study Country"),
  ];
  it("returns all objects for an empty query", () => {
    expect(filterObjectSummaries(objects, "")).toHaveLength(3);
  });
  it("filters by api_name or label", () => {
    expect(filterObjectSummaries(objects, "study").map((o) => o.api_name)).toEqual([
      "study__v",
      "study_country__v",
    ]);
    expect(filterObjectSummaries(objects, "Activity")).toHaveLength(1);
  });
  it("keeps an object when a nested object type matches", () => {
    expect(filterObjectSummaries(objects, "Base Study").map((o) => o.api_name)).toEqual([
      "study__v",
    ]);
  });
});

describe("flattenObjectSummaries", () => {
  it("emits a parent row plus indented object-type child rows", () => {
    const rows = flattenObjectSummaries([
      objectSummary("study__v", "Study", [
        { api_name: "base__v", label: "Base Study", actions: ["read"], available_actions: [] },
        {
          api_name: "interventional__v",
          label: "Interventional",
          actions: ["read", "create"],
          available_actions: [],
        },
      ]),
      objectSummary("site__v", "Site"),
    ]);
    expect(rows.map((r) => r.key)).toEqual([
      "study__v",
      "study__v:base__v",
      "study__v:interventional__v",
      "site__v",
    ]);
    expect(rows[1]).toMatchObject({
      kind: "object_type",
      objectApiName: "study__v",
      type: { api_name: "base__v", actions: ["read"] },
    });
    expect(rows[3]).toMatchObject({ kind: "object", object: { api_name: "site__v" } });
  });
});

describe("parseTabEntryKey / groupTabEntries", () => {
  it("parses top-level, nested, and collection keys", () => {
    expect(parseTabEntryKey("tab.home__v.tab_actions")).toEqual({
      kind: "tab",
      apiName: "home__v",
    });
    expect(parseTabEntryKey("tab.issue_management__ctms.issues__c.tab_actions")).toEqual({
      kind: "subtab",
      collection: "issue_management__ctms",
      apiName: "issues__c",
    });
    expect(parseTabEntryKey("tab_collection.reports__c.tab_collection_actions")).toEqual({
      kind: "tab_collection",
      apiName: "reports__c",
    });
  });

  it("groups subtabs under their collection with resolved labels", () => {
    const groups = groupTabEntries(
      [
        entry("tab.home__v.tab_actions", ["view"]),
        entry("tab.issue_management__ctms.issues__c.tab_actions", ["view"]),
        entry("tab.issue_management__ctms.observations__c.tab_actions", ["view"]),
      ],
      {
        "tab.home__v.tab_actions": "Home",
        "tab.issue_management__ctms": "Issue Management",
        "tab.issue_management__ctms.issues__c.tab_actions": "All Issues",
        "tab.issue_management__ctms.observations__c.tab_actions": "Observations",
      },
    );
    expect(groups.map((g) => g.label)).toEqual(["Home", "Issue Management"]);
    const issues = groups.find((g) => g.apiName === "issue_management__ctms")!;
    expect(issues.actions).toEqual([]);
    expect(issues.subtabs.map((s) => s.label)).toEqual(["All Issues", "Observations"]);
    const rows = flattenTabGroups(groups);
    expect(rows.map((r) => r.kind)).toEqual(["tab", "tab", "subtab", "subtab"]);
  });

  it("filters by subtab label while keeping the parent", () => {
    const groups = groupTabEntries(
      [
        entry("tab.home__v.tab_actions", ["view"]),
        entry("tab.issue_management__ctms.issues__c.tab_actions", ["view"]),
        entry("tab.issue_management__ctms.observations__c.tab_actions", ["view"]),
      ],
      {
        "tab.home__v.tab_actions": "Home",
        "tab.issue_management__ctms": "Issue Management",
        "tab.issue_management__ctms.issues__c.tab_actions": "All Issues",
        "tab.issue_management__ctms.observations__c.tab_actions": "Observations",
      },
    );
    const filtered = filterTabGroups(groups, "observations");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].label).toBe("Issue Management");
    expect(filtered[0].subtabs.map((s) => s.label)).toEqual(["Observations"]);
  });
});

describe("groupCapabilityEntries", () => {
  it("buckets Admin keys into Veeva section headings", () => {
    const sections = groupCapabilityEntries("admin", [
      entry("security.users", ["read"]),
      entry("configuration.picklists", ["read"]),
      entry("configuration.settings.branding", ["read"]),
      entry("operations.renditions", ["read"]),
      entry("domain_administration", ["read"]),
      entry("vault_loader", ["submit"]),
    ]);
    expect(sections.map((s) => s.id)).toEqual([
      "security",
      "configuration",
      "settings",
      "operations",
      "domain_administration",
      "deployment",
    ]);
    expect(sections.find((s) => s.id === "settings")!.entries.map((e) => e.key)).toEqual([
      "configuration.settings.branding",
    ]);
  });

  it("buckets Application keys into Vault Actions / Owner / Client Applications", () => {
    const sections = groupCapabilityEntries("application", [
      entry("vault_actions.api", ["access"]),
      entry("vault_owner_actions", ["vault_owner"]),
      entry("vault_client_applications.veeva_snap", ["access"]),
    ]);
    expect(sections.map((s) => s.id)).toEqual([
      "vault_actions",
      "vault_owner_actions",
      "vault_client_applications",
    ]);
  });

  it("classifies configuration.settings under Settings, not Configuration", () => {
    expect(capabilitySectionOf("configuration.settings")).toBe("settings");
    expect(capabilitySectionOf("configuration.picklists")).toBe("configuration");
    expect(capabilitySectionOf("vault_loader")).toBe("deployment");
  });
});
