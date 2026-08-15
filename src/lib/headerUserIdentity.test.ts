import { describe, expect, it } from "vitest";
import { resolveHeaderUserIdentity, shouldShowHeaderUserEmail } from "./headerUserIdentity";

describe("resolveHeaderUserIdentity", () => {
  it("prefers profile name and email over session username", () => {
    expect(
      resolveHeaderUserIdentity({
        profileName: "Lin1 Cao",
        profileEmail: "Lin.Cao@example.com",
        sessionUsername: "other@domain",
      }),
    ).toEqual({
      displayName: "Lin1 Cao",
      email: "Lin.Cao@example.com",
    });
  });

  it("falls back to session username without using user id", () => {
    expect(
      resolveHeaderUserIdentity({
        sessionUsername: "demo@domain.test",
      }),
    ).toEqual({
      displayName: "demo@domain.test",
      email: "demo@domain.test",
    });
  });

  it("uses User when no profile or username is available", () => {
    expect(resolveHeaderUserIdentity({})).toEqual({
      displayName: "User",
      email: "",
    });
  });
});

describe("shouldShowHeaderUserEmail", () => {
  it("hides duplicate email line when it matches display name", () => {
    expect(shouldShowHeaderUserEmail("demo@domain.test", "demo@domain.test")).toBe(false);
  });

  it("shows email when different from display name", () => {
    expect(shouldShowHeaderUserEmail("Lin1 Cao", "Lin.Cao@example.com")).toBe(true);
  });
});
