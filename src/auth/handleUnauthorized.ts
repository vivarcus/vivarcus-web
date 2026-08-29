import { isLoginHost, loadPublicAuthConfig } from "../lib/vaultDns";
import { clearSession } from "./session";

let handling = false;

/** Paths where 401 means bad credentials, not an expired session. */
function isCredentialChallengePath(path: string): boolean {
  const p = path.split("?")[0] ?? path;
  return (
    p === "/ui/auth/login" ||
    p === "/ui/auth/resolve" ||
    p === "/ui/auth/invite" ||
    p === "/ui/auth/stepup" ||
    p === "/ui/auth/stepup/verify" ||
    p.startsWith("/ui/auth/oauth/") ||
    p === "/ui/user-profile/password"
  );
}

/** True when the 401 body indicates a missing/invalid/expired session. */
export function looksLikeSessionExpired(body: unknown): boolean {
  if (body == null || typeof body !== "object") return false;
  const obj = body as Record<string, unknown>;

  const err = obj.error;
  if (typeof err === "string") {
    const e = err.toLowerCase();
    return (
      e === "session_required" ||
      e === "session_invalid" ||
      e.includes("invalid or expired session") ||
      e.includes("session id is not valid")
    );
  }
  if (err && typeof err === "object") {
    const structured = err as { code?: string; message?: string };
    const code = (structured.code ?? "").toUpperCase();
    const msg = (structured.message ?? "").toLowerCase();
    if (code === "INVALID_SESSION_ID") return true;
    if (msg.includes("invalid or expired session")) return true;
    if (msg.includes("session id is not valid")) return true;
    if (msg.includes("has expired") && msg.includes("session")) return true;
    if (code === "UNAUTHORIZED" && msg.includes("authentication required")) return true;
  }

  const errors = obj.errors;
  if (Array.isArray(errors)) {
    return errors.some((item) => {
      if (!item || typeof item !== "object") return false;
      const type = String((item as { type?: string }).type ?? "").toUpperCase();
      return type === "INVALID_SESSION_ID";
    });
  }
  return false;
}

async function redirectToLoginPortal(): Promise<void> {
  try {
    const cfg = await loadPublicAuthConfig();
    const base = cfg.vault_dns_base;
    if (base && !isLoginHost(window.location.hostname, base)) {
      const scheme = window.location.protocol === "http:" ? "http" : "https";
      window.location.replace(`${scheme}://login.${base}/login`);
      return;
    }
  } catch {
    // Fall through to same-origin /login.
  }
  if (!window.location.pathname.startsWith("/login")) {
    window.location.replace("/login");
  }
}

/** Clear local auth and navigate to the login portal (once per page lifetime). */
export function notifySessionExpired(): void {
  if (handling) return;
  handling = true;
  clearSession();
  void redirectToLoginPortal();
}

/**
 * When a Bearer-authenticated request returns a session-expired 401,
 * clear local session and redirect to login.
 */
export function maybeHandleUnauthorized(args: {
  status: number;
  body: unknown;
  requestPath: string;
  hadSessionToken: boolean;
}): void {
  if (args.status !== 401 || !args.hadSessionToken) return;
  if (isCredentialChallengePath(args.requestPath)) return;
  if (!looksLikeSessionExpired(args.body)) return;
  notifySessionExpired();
}

/** Test helper. */
export function resetSessionExpiredHandlerForTests(): void {
  handling = false;
}
