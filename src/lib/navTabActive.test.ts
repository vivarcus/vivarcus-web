import { describe, expect, it } from "vitest";
import { isNavTabActive } from "./navTabActive";

describe("isNavTabActive", () => {
  it("matches object tabs by api_name", () => {
    expect(
      isNavTabActive(
        { api_name: "study__v", label: "Study", kind: "object", route: "/objects/study__v" },
        "study__v",
      ),
    ).toBe(true);
  });

  it("matches page tabs by page_api_name", () => {
    expect(
      isNavTabActive(
        {
          api_name: "admin_page_tab__v",
          label: "Admin",
          kind: "page",
          route: "/pages/home__v",
          page_api_name: "home__v",
        },
        "admin_page_tab__v",
        "home__v",
      ),
    ).toBe(true);
  });

  it("only highlights home on vault home route even when last tab is remembered", () => {
    const home = {
      api_name: "home__v",
      label: "Home",
      kind: "task_dashboard",
      route: "/",
    };
    const studyInfo = {
      api_name: "study_info__c",
      label: "Study Info",
      kind: "unsupported",
      route: "/tabs/study_info__c",
    };

    expect(isNavTabActive(home, "study_info__c", undefined, "/")).toBe(true);
    expect(isNavTabActive(studyInfo, "study_info__c", undefined, "/")).toBe(false);
  });

  it("does not highlight home when viewing another tab route", () => {
    const home = {
      api_name: "home__v",
      label: "Home",
      kind: "task_dashboard",
      route: "/",
    };

    expect(isNavTabActive(home, "study_info__c", undefined, "/tabs/study_info__c")).toBe(false);
    expect(
      isNavTabActive(
        {
          api_name: "study_info__c",
          label: "Study Info",
          kind: "unsupported",
          route: "/tabs/study_info__c",
        },
        "study_info__c",
        undefined,
        "/tabs/study_info__c",
      ),
    ).toBe(true);
  });

  it("highlights Vault AI tab on /vault-ai and not Home", () => {
    const home = {
      api_name: "home__v",
      label: "Tasks",
      kind: "task_dashboard",
      route: "/",
    };
    const ai = {
      api_name: "vault_ai__sys",
      label: "AI+",
      kind: "vault_ai",
      route: "/vault-ai",
    };
    expect(isNavTabActive(ai, undefined, undefined, "/vault-ai")).toBe(true);
    expect(isNavTabActive(home, undefined, undefined, "/vault-ai")).toBe(false);
    expect(isNavTabActive(ai, undefined, undefined, "/")).toBe(false);
    expect(isNavTabActive(home, undefined, undefined, "/")).toBe(true);
  });
});
