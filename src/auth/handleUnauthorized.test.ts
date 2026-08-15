import { afterEach, describe, expect, it, vi } from "vitest";
import {
  looksLikeSessionExpired,
  maybeHandleUnauthorized,
  resetSessionExpiredHandlerForTests,
} from "./handleUnauthorized";
import { clearSession, saveSession, SESSION_KEY } from "./session";
import { resetPublicAuthConfigCache } from "../lib/vaultDns";

describe("looksLikeSessionExpired", () => {
  it("matches UI middleware structured errors", () => {
    expect(
      looksLikeSessionExpired({
        error: { code: "UNAUTHORIZED", message: "invalid or expired session" },
      }),
    ).toBe(true);
    expect(
      looksLikeSessionExpired({
        error: { code: "UNAUTHORIZED", message: "authentication required" },
      }),
    ).toBe(true);
  });

  it("matches string session errors", () => {
    expect(looksLikeSessionExpired({ error: "session_required" })).toBe(true);
    expect(looksLikeSessionExpired({ error: "session_invalid" })).toBe(true);
  });

  it("matches Vault REST INVALID_SESSION_ID", () => {
    expect(
      looksLikeSessionExpired({
        responseStatus: "FAILURE",
        errors: [
          {
            type: "INVALID_SESSION_ID",
            message: "The session ID is not valid or has expired.",
          },
        ],
      }),
    ).toBe(true);
  });

  it("does not match credential failures", () => {
    expect(looksLikeSessionExpired({ error: "unauthorized" })).toBe(false);
    expect(
      looksLikeSessionExpired({ error: "current password is incorrect" }),
    ).toBe(false);
    expect(
      looksLikeSessionExpired({
        error: { code: "FORBIDDEN", message: "forbidden" },
      }),
    ).toBe(false);
  });
});

describe("maybeHandleUnauthorized", () => {
  afterEach(() => {
    clearSession();
    resetSessionExpiredHandlerForTests();
    resetPublicAuthConfigCache();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function seedSession() {
    saveSession({
      sessionToken: "tok-expired",
      userId: "user-1",
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
  }

  it("clears session and redirects on expired UI API 401", async () => {
    seedSession();
    const replace = vi.fn();
    vi.stubGlobal("location", {
      hostname: "localhost",
      pathname: "/tabs/studies__c",
      protocol: "http:",
      replace,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ vault_dns_base: "" }), { status: 200 }),
      ),
    );

    maybeHandleUnauthorized({
      status: 401,
      body: {
        error: { code: "UNAUTHORIZED", message: "invalid or expired session" },
      },
      requestPath: "/ui/navigation",
      hadSessionToken: true,
    });

    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    await vi.waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/login");
    });
  });

  it("redirects vault host to login portal when DNS base is configured", async () => {
    seedSession();
    const replace = vi.fn();
    vi.stubGlobal("location", {
      hostname: "acme.example.com",
      pathname: "/",
      protocol: "https:",
      replace,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ vault_dns_base: "example.com" }), {
          status: 200,
        }),
      ),
    );

    maybeHandleUnauthorized({
      status: 401,
      body: {
        error: { code: "UNAUTHORIZED", message: "invalid or expired session" },
      },
      requestPath: "/ui/me/vaults",
      hadSessionToken: true,
    });

    await vi.waitFor(() => {
      expect(replace).toHaveBeenCalledWith("https://login.example.com/login");
    });
  });

  it("ignores step-up wrong-password 401", () => {
    seedSession();
    const replace = vi.fn();
    vi.stubGlobal("location", {
      hostname: "localhost",
      pathname: "/",
      protocol: "http:",
      replace,
    });

    maybeHandleUnauthorized({
      status: 401,
      body: { error: "unauthorized" },
      requestPath: "/ui/auth/stepup",
      hadSessionToken: true,
    });

    expect(localStorage.getItem(SESSION_KEY)).toBe("tok-expired");
    expect(replace).not.toHaveBeenCalled();
  });

  it("ignores login 401 without treating as session expiry", () => {
    const replace = vi.fn();
    vi.stubGlobal("location", {
      hostname: "localhost",
      pathname: "/login",
      protocol: "http:",
      replace,
    });

    maybeHandleUnauthorized({
      status: 401,
      body: { error: { code: "UNAUTHORIZED", message: "invalid credentials" } },
      requestPath: "/ui/auth/login",
      hadSessionToken: false,
    });

    expect(replace).not.toHaveBeenCalled();
  });

  it("only redirects once when multiple 401s fire", async () => {
    seedSession();
    const replace = vi.fn();
    vi.stubGlobal("location", {
      hostname: "localhost",
      pathname: "/",
      protocol: "http:",
      replace,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ vault_dns_base: "" }), { status: 200 }),
      ),
    );

    const body = {
      error: { code: "UNAUTHORIZED", message: "invalid or expired session" },
    };
    maybeHandleUnauthorized({
      status: 401,
      body,
      requestPath: "/ui/a",
      hadSessionToken: true,
    });
    maybeHandleUnauthorized({
      status: 401,
      body,
      requestPath: "/ui/b",
      hadSessionToken: true,
    });

    await vi.waitFor(() => {
      expect(replace).toHaveBeenCalledTimes(1);
    });
  });
});
