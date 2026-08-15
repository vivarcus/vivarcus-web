import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { api } from "../api/client";
import { isLoginHost, loadPublicAuthConfig } from "./vaultDns";
import { loginPortalURL } from "./vaultHostNav";

/** Unauthenticated visitors on a vault host go to login.{base}. */
export function RequireLoginHost() {
  const [ready, setReady] = useState(false);
  const [external, setExternal] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const cfg = await loadPublicAuthConfig(() => api.publicAuthConfig());
      if (cancelled) return;
      const base = cfg.vault_dns_base;
      if (base && !isLoginHost(window.location.hostname, base)) {
        setExternal(loginPortalURL(base));
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (external) {
      window.location.replace(external);
    }
  }, [external]);

  if (!ready) {
    return null;
  }
  if (external) {
    return null;
  }
  return <Navigate to="/login" replace />;
}
