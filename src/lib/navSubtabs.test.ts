import { describe, expect, it } from "vitest";
import {
  collectionHasActiveEntry,
  entriesFromCollection,
  findActiveTabMeta,
  findCollectionForActiveTab,
  firstObjectTab,
  firstTabInCollection,
} from "./navCollection";
import { primaryNavTab, tabContainsActiveNavTarget } from "./navTabUtils";
import type { NavCollection } from "../api/types";

const label = (text: string) => ({ text, fallback_source: "base_language" as const });

const containerTab = {
  api_name: "study_info__c",
  label: label("Study Info"),
  kind: "unsupported",
  route: "/tabs/study_info__c",
  navigation_context: "all",
  subtabs: [
    {
      api_name: "studies__c",
      label: label("Studies"),
      kind: "object",
      route: "/tabs/studies__c",
      object_api_name: "study__v",
      navigation_context: "all",
    },
  ],
};

const collections: NavCollection[] = [
  {
    api_name: "all_tabs__v",
    system_kind: "all",
    label: label("All"),
    items: [{ item_type: "tab", label: label("Study Info"), tab: containerTab }],
  },
];

const platformLogsTab = {
  api_name: "platform_admin_logs__v",
  label: label("Logs"),
  kind: "platform",
  route: "/admin/audit-logs",
  admin_tab: true,
  admin_surface: "admin",
  subtabs: [
    {
      api_name: "platform_admin_logs_login__v",
      label: label("Login Audit History"),
      kind: "platform",
      route: "/admin/audit-logs/login",
      admin_tab: true,
      admin_surface: "admin",
    },
    {
      api_name: "platform_admin_logs_system__v",
      label: label("System Audit History"),
      kind: "platform",
      route: "/admin/audit-logs/system",
      admin_tab: true,
      admin_surface: "admin",
    },
  ],
};

describe("navTabUtils", () => {
  it("uses the first subtab for menu container tabs", () => {
    expect(primaryNavTab(containerTab).api_name).toBe("studies__c");
  });

  it("uses the first subtab for platform admin tabs", () => {
    expect(primaryNavTab(platformLogsTab).route).toBe("/admin/audit-logs/login");
  });

  it("lands Configuration on the hub parent route", () => {
    const configurationTab = {
      api_name: "platform_admin_configuration__v",
      label: label("Configuration"),
      kind: "platform" as const,
      route: "/admin/configuration",
      admin_tab: true,
      admin_surface: "admin" as const,
      subtabs: [
        {
          api_name: "platform_admin_configuration_objects__v",
          label: label("Objects"),
          kind: "platform" as const,
          route: "/admin/configuration/objects",
          admin_tab: true,
          admin_surface: "admin" as const,
        },
      ],
    };
    expect(primaryNavTab(configurationTab).route).toBe("/admin/configuration");
  });

  it("detects active state on nested subtabs", () => {
    const isActive = (tab: { api_name: string }) => tab.api_name === "studies__c";
    expect(tabContainsActiveNavTarget(containerTab, isActive)).toBe(true);
  });
});

describe("navCollection subtabs", () => {
  it("finds the collection for an active subtab", () => {
    expect(findCollectionForActiveTab(collections, "studies__c")?.api_name).toBe("all_tabs__v");
  });

  it("detects active entries inside container tabs", () => {
    const entries = entriesFromCollection(collections[0]);
    expect(collectionHasActiveEntry(entries, "studies__c")).toBe(true);
  });

  it("resolves active tab metadata from subtabs", () => {
    expect(findActiveTabMeta(collections, "studies__c")?.api_name).toBe("studies__c");
  });

  it("links to the first subtab for container tabs", () => {
    expect(firstTabInCollection("demo", collections[0])).toBe("/tabs/studies__c");
  });

  it("finds the first object tab inside container subtabs", () => {
    expect(firstObjectTab(collections)?.api_name).toBe("studies__c");
  });
});
