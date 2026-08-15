import { describe, expect, it } from "vitest";
import {
  collectionHasActiveEntry,
  collectionKind,
  entriesFromCollection,
  findCollectionForActiveTab,
  isAdminCollection,
  isBusinessAdminCollection,
} from "./navCollection";
import type { NavCollection } from "../api/types";

const label = (text: string) => ({ text, fallback_source: "base_language" as const });

const collections: NavCollection[] = [
  {
    api_name: "all_tabs__v",
    system_kind: "all",
    label: label("All"),
    items: [
      {
        item_type: "tab",
        label: label("Studies"),
        tab: {
          api_name: "studies_tab",
          label: label("Studies"),
          kind: "object",
          route: "/tabs/studies",
          object_api_name: "study__v",
          navigation_context: "all",
        },
      },
      {
        item_type: "menu",
        label: label("Planning"),
        menu_tabs: [
          {
            api_name: "plan_a",
            label: label("Plan A"),
            kind: "object",
            route: "/tabs/plan_a",
            object_api_name: "plan__v",
            navigation_context: "all",
          },
        ],
      },
    ],
  },
  {
    api_name: "admin_tabs__v",
    system_kind: "admin",
    label: label("Admin"),
    items: [
      {
        item_type: "tab",
        label: label("Logs"),
        tab: {
          api_name: "platform_admin_logs__v",
          label: label("Logs"),
          kind: "platform",
          route: "/admin/audit-logs",
          navigation_context: "admin",
        },
      },
    ],
  },
];

describe("navCollection", () => {
  it("detects collection kinds from system_kind", () => {
    expect(collectionKind(collections[0])).toBe("all");
    expect(collectionKind(collections[1])).toBe("admin");
    expect(isAdminCollection(collections[1])).toBe(true);
    expect(isBusinessAdminCollection(collections[0])).toBe(false);
  });

  it("keeps menu items grouped instead of flattening tabs", () => {
    expect(entriesFromCollection(collections[0])).toEqual([
      expect.objectContaining({ kind: "tab" }),
      expect.objectContaining({ kind: "menu", tabs: expect.any(Array) }),
    ]);
  });

  it("finds the collection for the active tab", () => {
    expect(findCollectionForActiveTab(collections, "studies_tab")?.api_name).toBe("all_tabs__v");
    expect(findCollectionForActiveTab(collections, "plan_a")?.api_name).toBe("all_tabs__v");
  });

  it("detects whether a collection has an active entry", () => {
    const entries = entriesFromCollection(collections[1]);
    expect(collectionHasActiveEntry(entries, "platform_admin_logs__v")).toBe(true);
    expect(collectionHasActiveEntry(entries, "studies_tab")).toBe(false);
  });

  it("detects platform tab activity from pathname when activeTab is stale", () => {
    const entries = entriesFromCollection(collections[1]);
    expect(
      collectionHasActiveEntry(
        entries,
        "studies_tab",
        undefined,
        "/admin/audit-logs",
      ),
    ).toBe(true);
    expect(
      collectionHasActiveEntry(
        entries,
        "studies_tab",
        undefined,
        "/tabs/studies",
      ),
    ).toBe(false);
  });
});
