import { Outlet, useLocation } from "react-router-dom";
import { useMemo } from "react";
import { AdminSectionSidebar } from "../components/admin/AdminSectionSidebar";
import { ConfigurationComponentsSidebar } from "../components/admin/ConfigurationComponentsSidebar";
import { useOptionalNavigationContext } from "../context/NavigationContext";
import { useVaultId } from "../hooks/useVaultId";
import { findAdminSectionNav } from "../lib/adminSectionNav";
import { isConfigurationPath } from "../lib/configurationComponents";
import { isLegacyAdminRoute, routeAllowedInNav } from "../lib/adminRoutes";
import { ForbiddenPage } from "../pages/ForbiddenPage";
import { Spin } from "antd";
import { useUi } from "../context/UiContext";
import { displayText } from "../lib/i18n";

/** Route guard for admin / business-admin pages. Secondary nav lives in the left sidebar. */
export function AdminConsoleLayout() {
  const location = useLocation();
  const vaultId = useVaultId();
  const navCtx = useOptionalNavigationContext();
  const { shell } = useUi();

  const allowed = useMemo(() => {
    if (isLegacyAdminRoute(location.pathname)) {
      return true;
    }
    return routeAllowedInNav(location.pathname, navCtx?.nav);
  }, [location.pathname, navCtx?.nav]);

  const sectionNav = useMemo(
    () => findAdminSectionNav(location.pathname, navCtx?.nav),
    [location.pathname, navCtx?.nav],
  );

  const configurationShell = isConfigurationPath(location.pathname);

  if (navCtx?.error) {
    return <div className="admin-console admin-console--error">{navCtx.error}</div>;
  }
  if (!navCtx?.nav && !isLegacyAdminRoute(location.pathname)) {
    return (
      <div className="admin-console admin-console--loading">
        <Spin description={displayText(shell.loading_nav)} />
      </div>
    );
  }
  if (!allowed) {
    return <ForbiddenPage />;
  }

  if (configurationShell) {
    return (
      <div className="admin-console list-page">
        <ConfigurationComponentsSidebar vaultId={vaultId} nav={navCtx?.nav} />
        <div className="list-page__content admin-console__content">
          <Outlet />
        </div>
      </div>
    );
  }

  const hasSidebar = Boolean(sectionNav);
  return (
    <div className={`admin-console list-page${hasSidebar ? "" : " list-page--no-sidebar"}`}>
      {sectionNav ? (
        <AdminSectionSidebar vaultId={vaultId} section={sectionNav} pathname={location.pathname} />
      ) : null}
      <div className="list-page__content admin-console__content">
        <Outlet />
      </div>
    </div>
  );
}
