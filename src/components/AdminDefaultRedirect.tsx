import { Navigate } from "react-router-dom";
import { useOptionalNavigationContext } from "../context/NavigationContext";
import { adminChildPath, resolveAdminDefaultHref } from "../lib/adminDefaultRoute";

type AdminCollectionRedirectProps = {
  fallback?: string;
};

/** Lands on the first visible Admin catalog tab (and subtab when applicable). */
export function AdminCollectionRedirect({ fallback = "audit-logs/system" }: AdminCollectionRedirectProps) {
  const navCtx = useOptionalNavigationContext();
  const target = resolveAdminDefaultHref(navCtx?.nav);
  if (!target) {
    return <Navigate to={fallback} replace />;
  }
  return <Navigate to={adminChildPath("/admin", target)} replace />;
}

type AdminTabRedirectProps = {
  parentRoute: string;
  fallback: string;
};

/** Lands on the first visible subtab for one Admin parent tab route. */
export function AdminTabRedirect({ parentRoute, fallback }: AdminTabRedirectProps) {
  const navCtx = useOptionalNavigationContext();
  const target = resolveAdminDefaultHref(navCtx?.nav, parentRoute);
  if (!target) {
    return <Navigate to={fallback} replace />;
  }
  return <Navigate to={adminChildPath(parentRoute, target)} replace />;
}
