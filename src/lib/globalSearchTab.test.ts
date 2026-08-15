import { describe, expect, it } from "vitest";
import type { NavigationModel } from "../api/types";
import {
  DEFAULT_SEARCH_TAB,
  isSearchableObjectTab,
  listSearchableObjectTabs,
  resolveHeaderSearchTab,
} from "./globalSearchTab";

const nav = {
  model_type: "navigation",
  vault_id: "v1",
  display_context: { language: "en", locale: "en_US", timezone: "UTC" },
  chrome: {} as NavigationModel["chrome"],
  ui_fingerprint: "fp",
  collections: [
    {
      api_name: "main",
      label: { text: "Main" },
      items: [
        {
          item_type: "tab",
          label: { text: "Studies" },
          tab: {
            api_name: "studies__v",
            label: { text: "Studies" },
            kind: "object",
            route: "/tabs/studies__v",
            object_api_name: "study__v",
          },
        },
        {
          item_type: "tab",
          label: { text: "Library" },
          tab: {
            api_name: "library__v",
            label: { text: "Library" },
            kind: "object",
            route: "/tabs/library__v",
            object_api_name: "document__v",
          },
        },
        {
          item_type: "tab",
          label: { text: "Home" },
          tab: {
            api_name: "home__v",
            label: { text: "Home" },
            kind: "page",
            route: "/pages/home",
            page_api_name: "home__v",
          },
        },
      ],
    },
  ],
} as NavigationModel;

describe("resolveHeaderSearchTab", () => {
  it("uses the current searchable object tab", () => {
    expect(resolveHeaderSearchTab(nav, "studies__v")).toBe("studies__v");
  });

  it("defaults to Library when not on a searchable object tab", () => {
    expect(resolveHeaderSearchTab(nav, undefined)).toBe(DEFAULT_SEARCH_TAB);
    expect(resolveHeaderSearchTab(nav, "home__v")).toBe(DEFAULT_SEARCH_TAB);
    expect(resolveHeaderSearchTab(null, "studies__v")).toBe(DEFAULT_SEARCH_TAB);
  });
});

describe("listSearchableObjectTabs", () => {
  it("returns object tabs only", () => {
    expect(listSearchableObjectTabs(nav).map((tab) => tab.apiName)).toEqual([
      "studies__v",
      "library__v",
    ]);
  });
});

describe("isSearchableObjectTab", () => {
  it("accepts object tabs with an object api name", () => {
    expect(
      isSearchableObjectTab({
        api_name: "library__v",
        label: { text: "Library" },
        kind: "object",
        route: "/tabs/library__v",
        object_api_name: "document__v",
      }),
    ).toBe(true);
  });

  it("rejects page tabs", () => {
    expect(
      isSearchableObjectTab({
        api_name: "home__v",
        label: { text: "Home" },
        kind: "page",
        route: "/pages/home",
        page_api_name: "home__v",
      }),
    ).toBe(false);
  });
});
