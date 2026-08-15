import { describe, expect, it } from "vitest";
import {
  applyCreateDomainUserDraft,
  displayNameFromDraft,
  isCreateDomainUserDraftValid,
  stagedDomainUserLabel,
} from "./domainUserFormUtils";

describe("domainUserFormUtils", () => {
  it("validates required create draft fields", () => {
    expect(
      isCreateDomainUserDraftValid({
        firstName: "Regulatory",
        lastName: "Inspector",
        localpart: "inspector",
        email: "inspector@novacrest.com",
        language: "lang-1",
        locale: "locale-1",
        timezone: "UTC",
      }),
    ).toBe(true);
    expect(
      isCreateDomainUserDraftValid({
        firstName: "",
        lastName: "Inspector",
        localpart: "inspector",
        email: "inspector@novacrest.com",
        language: "lang-1",
        locale: "locale-1",
        timezone: "UTC",
      }),
    ).toBe(false);
  });

  it("builds staged labels and display names", () => {
    const draft = {
      firstName: "Regulatory",
      lastName: "Inspector",
      localpart: "inspector",
      email: "inspector@novacrest.com",
      language: "lang-1",
      locale: "locale-1",
      timezone: "UTC",
    };
    expect(displayNameFromDraft(draft, "novacrest.com")).toBe("Regulatory Inspector");
    expect(stagedDomainUserLabel(draft, "novacrest.com")).toBe(
      "Regulatory Inspector (inspector@novacrest.com)",
    );
  });

  it("applies create draft to parent form fields", () => {
    const changes: Array<[string, unknown]> = [];
    applyCreateDomainUserDraft(
      {
        firstName: "Ming",
        lastName: "Li",
        localpart: "li.ming",
        email: "li.ming@novacrest.com",
        language: "lang-1",
        locale: "locale-1",
        timezone: "UTC",
      },
      "novacrest.com",
      (name, value) => changes.push([name, value]),
    );
    expect(changes).toContainEqual(["domain_user_id__sys", ""]);
    expect(changes).toContainEqual(["username__sys", "li.ming@novacrest.com"]);
    expect(changes).toContainEqual(["name__v", "Ming Li"]);
  });
});
