import { afterEach, describe, expect, it } from "vitest";
import {
  clearSession,
  getSessionToken,
  loadSession,
  saveSession,
  SESSION_KEY,
} from "./session";

describe("session", () => {
  afterEach(() => {
    clearSession();
  });

  it("persists auth in localStorage so new tabs can load the session", () => {
    saveSession({
      sessionToken: "tok-1",
      userId: "user-1",
      username: "alice",
      homeDomainId: "domain.test",
      vaults: [
        {
          vault_id: "vault-1",
          domain_id: "domain.test",
          name: "Vault",
          state: "Active",
        },
      ],
    });

    expect(getSessionToken()).toBe("tok-1");
    expect(loadSession()?.sessionToken).toBe("tok-1");
    expect(localStorage.getItem(SESSION_KEY)).toBe("tok-1");
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it("migrates legacy sessionStorage auth on first read", () => {
    sessionStorage.setItem(SESSION_KEY, "legacy-tok");
    sessionStorage.setItem("vivarcus.user_id", "user-legacy");
    sessionStorage.setItem("vivarcus.home_domain_id", "domain.test");
    sessionStorage.setItem(
      "vivarcus.vaults",
      JSON.stringify([
        {
          vault_id: "vault-1",
          domain_id: "domain.test",
          name: "Vault",
          state: "Active",
        },
      ]),
    );

    expect(loadSession()?.sessionToken).toBe("legacy-tok");
    expect(localStorage.getItem(SESSION_KEY)).toBe("legacy-tok");
  });
});
