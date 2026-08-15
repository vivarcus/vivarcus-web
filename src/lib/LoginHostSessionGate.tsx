import { useEffect, useState, type ReactNode } from "react";
import { api, HttpError } from "../api/client";
import { notifySessionExpired } from "../auth/handleUnauthorized";
import type { SessionState } from "../auth/session";
import { RouteFallback } from "../layout/RouteFallback";
import { isLoginHost, loadPublicAuthConfig } from "./vaultDns";
import { redirectFromLoginHostIfConfigured } from "./vaultHostNav";

type GatePhase = "checking" | "open";

function mightNeedLoginHostGate(session: SessionState | null): boolean {
  if (!session?.selectedVaultId) return false;
  return window.location.hostname.toLowerCase().startsWith("login.");
}

/**
 * login.{base} is auth-only. When a session exists there, refresh vaults and hand off
 * to {dns}.{base} before mounting the app shell (avoids dual-host API storms).
 * Stale/invalid sessions are cleared back to /login.
 */
export function LoginHostSessionGate({
  session,
  pathname,
  search,
  children,
}: {
  session: SessionState | null;
  pathname: string;
  search: string;
  children: ReactNode;
}) {
  const [phase, setPhase] = useState<GatePhase>(() =>
    mightNeedLoginHostGate(session) ? "checking" : "open",
  );

  useEffect(() => {
    if (!session?.selectedVaultId) {
      setPhase("open");
      return;
    }

    let cancelled = false;

    void (async () => {
      const cfg = await loadPublicAuthConfig(() => api.publicAuthConfig());
      const base = cfg.vault_dns_base;
      if (!base || !isLoginHost(window.location.hostname, base)) {
        if (!cancelled) setPhase("open");
        return;
      }

      const path = `${pathname}${search}`;
      let vaults = session.vaults;

      try {
        const res = await api.meVaults();
        vaults = res.vaults;
      } catch {
        // apiFetch already redirects on session-expired 401; keep a local fallback.
        if (!cancelled) notifySessionExpired();
        return;
      }

      try {
        const redirected = await redirectFromLoginHostIfConfigured(
          session.selectedVaultId,
          vaults,
          path,
        );
        if (redirected) return;
      } catch (err) {
        if (err instanceof HttpError && err.status === 401) {
          if (!cancelled) notifySessionExpired();
          return;
        }
      }

      if (!cancelled) {
        notifySessionExpired();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session, pathname, search]);

  if (phase !== "open") {
    return <RouteFallback />;
  }
  return <>{children}</>;
}
