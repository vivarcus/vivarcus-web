import { describe, expect, it } from "vitest";
import type { NavigationModel } from "../api/types";
import { findObjectListTabInNav } from "./navObjects";

const nav = {
  collections: [
    {
      api_name: "c1",
      label: { text: "C" },
      items: [
        {
          item_type: "tab",
          label: { text: "Home" },
          tab: {
            api_name: "document_contributor_homepage__v",
            label: { text: "TMF Homepage" },
            kind: "page",
            route: "/pages/document_contributor_homepage__v",
            page_api_name: "document_contributor_homepage__v",
          },
        },
        {
          item_type: "menu",
          label: { text: "EDL" },
          menu_tabs: [
            {
              api_name: "edls_menu__c",
              label: { text: "EDL" },
              kind: "menu",
              route: "",
              subtabs: [
                {
                  api_name: "edl_items__c",
                  label: { text: "Expected Documents" },
                  kind: "object",
                  route: "/tabs/edl_items__c",
                  object_api_name: "edl_item__v",
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as NavigationModel;

describe("findObjectListTabInNav", () => {
  it("resolves object list tab when homepage tab hint is a page tab", () => {
    const tab = findObjectListTabInNav(nav, "edl_item__v", "document_contributor_homepage__v");
    expect(tab?.api_name).toBe("edl_items__c");
  });

  it("prefers preferred tab when it matches the object", () => {
    const tab = findObjectListTabInNav(nav, "edl_item__v", "edl_items__c");
    expect(tab?.api_name).toBe("edl_items__c");
  });

  it("returns undefined for unknown objects", () => {
    expect(findObjectListTabInNav(nav, "missing__v")).toBeUndefined();
  });
});
