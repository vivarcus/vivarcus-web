import { describe, expect, it } from "vitest";
import { tabHref } from "./tabHref";
import type { NavTab } from "../api/types";

describe("tabHref", () => {
  it("routes object tabs to tab list path", () => {
    const tab: NavTab = {
      api_name: "studies__v",
      label: "Studies",
      kind: "object",
      route: "/tabs/studies__v",
      object_api_name: "study__v",
    };
    expect(tabHref("vault-1", tab)).toBe("/tabs/studies__v");
  });

  it("routes container tabs to the first subtab", () => {
    const tab: NavTab = {
      api_name: "study_contacts__ctms",
      label: "Study Personnel & Communication",
      kind: "unsupported",
      route: "/tabs/study_contacts__ctms",
      subtabs: [
        {
          api_name: "study_organizations__v",
          label: "Study Organizations",
          kind: "object",
          route: "/tabs/study_organizations__v",
          object_api_name: "study_organization__v",
        },
      ],
    };
    expect(tabHref("vault-1", tab)).toBe("/tabs/study_organizations__v");
  });

  it("routes page tabs to pages path", () => {
    const tab: NavTab = {
      api_name: "admin_page__v",
      label: "Admin",
      kind: "page",
      route: "/pages/home__v",
      page_api_name: "home__v",
    };
    expect(tabHref("vault-1", tab)).toBe("/pages/home__v");
  });

  it("routes Tasks tab home__v to the dashboard even if route is a page stub", () => {
    const tab: NavTab = {
      api_name: "home__v",
      label: "Tasks",
      kind: "task_dashboard",
      route: "/pages/home__v",
      page_api_name: "home__v",
    };
    expect(tabHref("vault-1", tab)).toBe("/");
  });
});
