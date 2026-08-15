import { describe, expect, it } from "vitest";
import {
  filterBusinessAdminObjects,
  paginateBusinessAdminObjects,
  sourceLabel,
  toggleFavoriteBusinessAdminObject,
} from "./businessAdminObjects";

describe("filterBusinessAdminObjects", () => {
  const objects = [
    {
      api_name: "study__v",
      label: { text: "Study" },
      label_plural: { text: "Studies" },
      namespace: "__v",
      source: "standard" as const,
      route: "/business-admin/objects/study__v",
    },
    {
      api_name: "site__c",
      label: { text: "Site" },
      label_plural: { text: "Sites" },
      namespace: "__c",
      source: "custom" as const,
      route: "/business-admin/objects/site__c",
    },
  ];

  it("returns all objects when query is empty", () => {
    expect(filterBusinessAdminObjects(objects, "")).toHaveLength(2);
  });

  it("matches label and api name", () => {
    expect(filterBusinessAdminObjects(objects, "stud")).toEqual([objects[0]]);
  });

  it("matches source label", () => {
    expect(filterBusinessAdminObjects(objects, "custom")).toEqual([objects[1]]);
  });
});

describe("paginateBusinessAdminObjects", () => {
  const items = Array.from({ length: 30 }, (_, index) => index + 1);

  it("returns the requested page slice", () => {
    expect(paginateBusinessAdminObjects(items, 2, 25)).toEqual(items.slice(25, 50));
  });
});

describe("sourceLabel", () => {
  it("maps known sources", () => {
    expect(sourceLabel("standard")).toBe("Standard");
    expect(sourceLabel("application")).toBe("Application");
  });
});

describe("toggleFavoriteBusinessAdminObject", () => {
  it("adds and removes favorites in local storage", () => {
    const vaultId = "vault-test";
    localStorage.clear();
    expect(toggleFavoriteBusinessAdminObject(vaultId, "study__v")).toEqual(["study__v"]);
    expect(toggleFavoriteBusinessAdminObject(vaultId, "study__v")).toEqual([]);
  });
});
