import { api } from "../api/client";

const PENDING_DEFAULT_LANDING_KEY = "vivarcus.pending_default_landing";

export function markPendingDefaultLanding() {
  try {
    sessionStorage.setItem(PENDING_DEFAULT_LANDING_KEY, "1");
  } catch {
    // ignore
  }
}

/**
 * Resolve post-login landing like Veeva 26R2: Vault AI Tab when visible, else Home/Tasks (`/`).
 * Call after session + vault selection are established.
 */
export async function resolveDefaultLandingRoute(
  vaultId: string | null | undefined,
): Promise<string> {
  if (!vaultId) return "/";
  try {
    const nav = await api.navigation(vaultId);
    const landing = (nav.default_landing_route || "/").trim();
    return landing || "/";
  } catch {
    return "/";
  }
}

export function isPendingDefaultLanding(): boolean {
  try {
    return sessionStorage.getItem(PENDING_DEFAULT_LANDING_KEY) === "1";
  } catch {
    return false;
  }
}

export function consumePendingDefaultLanding(): boolean {
  try {
    if (sessionStorage.getItem(PENDING_DEFAULT_LANDING_KEY) !== "1") {
      return false;
    }
    sessionStorage.removeItem(PENDING_DEFAULT_LANDING_KEY);
    return true;
  } catch {
    return false;
  }
}

/** True while login should not paint "/" (Tasks) before redirecting to default_landing_route. */
export function shouldHoldDefaultLandingOutlet(opts: {
  hold: boolean;
  pathname: string;
  navReady: boolean;
  landingRoute?: string | null;
}): boolean {
  if (!opts.hold) return false;
  const onRoot = opts.pathname === "/" || opts.pathname === "";
  if (!onRoot) return false;
  if (!opts.navReady) return true;
  const landing = (opts.landingRoute || "/").trim() || "/";
  return landing !== "/" && landing !== "";
}
