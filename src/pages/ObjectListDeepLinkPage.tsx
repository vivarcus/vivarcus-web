import { useEffect } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useOptionalNavigationContext } from "../context/NavigationContext";
import { findObjectListTabInNav } from "../lib/navObjects";

/**
 * Deep-link shim for `/objects/{objectName}?tab=...&facet_filters=...`.
 * AppShell historically only registered record/create routes under `/objects/...`, so list
 * URLs from TMF Homepage Completeness fell through to `*` → login → `/`.
 */
export function ObjectListDeepLinkPage() {
  const { objectName = "" } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const navCtx = useOptionalNavigationContext();
  const nav = navCtx?.nav ?? null;
  const error = navCtx?.error ?? null;

  const tabHint = searchParams.get("tab");
  const target = findObjectListTabInNav(nav, objectName, tabHint);
  const navReady = Boolean(nav) || Boolean(error);

  useEffect(() => {
    if (!navReady || !target) return;
    const next = new URLSearchParams(searchParams);
    next.delete("tab");
    const qs = next.toString();
    navigate(`/tabs/${encodeURIComponent(target.api_name)}${qs ? `?${qs}` : ""}`, {
      replace: true,
    });
  }, [navReady, target, navigate, searchParams]);

  if (navReady && !target) {
    return <Navigate to="/" replace />;
  }
  return null;
}
