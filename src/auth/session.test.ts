import { afterEach, describe, expect, it } from "vitest";
import {
  clearSelectedVault,
  clearSession,
  getSessionToken,
  loadSession,
  saveSession,
  SESSION_KEY,
  setSelectedVault,
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

  it("syncs selected vault into a cookie that gateway can read", () => {
    saveSession({
      sessionToken: "tok-1",
      userId: "user-1",
      homeDomainId: "domain.test",
      vaults: [
        {
          vault_id: "550e8400-e29b-41d4-a716-446655440000",
          domain_id: "domain.test",
          name: "Vault",
          state: "Active",
        },
      ],
    });
    setSelectedVault("550e8400-e29b-41d4-a716-446655440000");
    expect(document.cookie).toContain("vivarcus_vault_id=550e8400-e29b-41d4-a716-446655440000");
    clearSelectedVault();
    expect(document.cookie).not.toContain("vivarcus_vault_id=550e8400-e29b-41d4-a716-446655440000");
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
