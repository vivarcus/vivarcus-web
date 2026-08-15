import { Suspense, useEffect, useRef, useState } from "react";
import { Link, Navigate, Outlet, useLocation, useMatch, useNavigate, useSearchParams } from "react-router-dom";
import { RouteFallback } from "./RouteFallback";
import { useAuth } from "../auth/AuthProvider";
import { NavigationProvider, useNavigationContext } from "../context/NavigationContext";
import { UiProvider } from "../context/UiContext";
import { DisplayLocaleAntdBridge } from "../theme/DisplayLocaleAntdBridge";
import { VaultAIProvider, useVaultAI } from "../context/VaultAIContext";
import {
  consumePendingDefaultLanding,
  isPendingDefaultLanding,
  shouldHoldDefaultLandingOutlet,
} from "../lib/defaultLanding";
import { displayText } from "../lib/i18n";
import { getLastTab } from "../lib/vaultNav";
import { RequireLoginHost } from "../lib/RequireLoginHost";
import { LoginHostSessionGate } from "../lib/LoginHostSessionGate";
import { HeaderMenus } from "./HeaderMenus";
import { GlobalHeaderSearch } from "./GlobalHeaderSearch";
import { TabNav } from "./TabNav";
import { AppHeaderLogo } from "./AppHeaderLogo";
import { VaultAIChatPanel } from "../components/VaultAIChatPanel";

function AppShellBody() {
  const { session, selectedVault, authChrome, refreshVaults } = useAuth();
  const vaultId = session?.selectedVaultId;
  const vaultsRefreshed = useRef(false);
  const [searchParams] = useSearchParams();
  const tabMatch = useMatch("/tabs/:tabApiName/*");
  const pageMatch = useMatch("/pages/:pageApiName/*");
  const recordMatch = useMatch("/objects/:objectName/records/:recordId");
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminRoute = /^\/admin(\/|$)/.test(location.pathname);
  const isBusinessAdminRoute = /^\/business-admin(\/|$)/.test(location.pathname);
  const { nav, error: navError, refetch } = useNavigationContext();
  const { open: vaultAIOpen, setOpen: setVaultAIOpen, pageNavigator } = useVaultAI();
  // Keep a local hold so Strict Mode remount / consume cannot flash Tasks before /vault-ai.
  const [landingHold, setLandingHold] = useState(() => isPendingDefaultLanding());

  useEffect(() => {
    if (!session || vaultsRefreshed.current) return;
    vaultsRefreshed.current = true;
    void refreshVaults().catch(() => {});
  }, [session, refreshVaults]);

  useEffect(() => {
    if (!landingHold) return;
    const onRoot = location.pathname === "/" || location.pathname === "";
    if (!onRoot) {
      setLandingHold(false);
      return;
    }
    if (!nav && !navError) return;
    if (navError || !nav) {
      consumePendingDefaultLanding();
      setLandingHold(false);
      return;
    }
    const landing = (nav.default_landing_route || "/").trim() || "/";
    consumePendingDefaultLanding();
    if (landing === "/" || landing === "") {
      setLandingHold(false);
      return;
    }
    navigate(landing, { replace: true });
  }, [landingHold, nav, navError, location.pathname, navigate]);

  if (!session) {
    return <RequireLoginHost />;
  }

  const vaultLabel = vaultId
    ? selectedVault?.name?.trim() || selectedVault?.domain_id || vaultId
    : displayText(authChrome.select_vault);

  if (!vaultId) {
    return (
      <div className="app-shell">
        <header className="app-header">
          <div className="app-header__start">
            <Link to="/" className="app-header__brand" aria-label="Vivarcus">
              <AppHeaderLogo />
            </Link>
          </div>
          <HeaderMenus vaultLabel={vaultLabel} vaultId={undefined} />
        </header>
        <main className="app-main">
          <div className="page vault-select-prompt">
            {session.vaults.length === 0 ? (
              <>
                <h2 className="vault-select-prompt__title">{displayText(authChrome.no_vaults)}</h2>
                <p className="vault-select-prompt__subtitle">{displayText(authChrome.no_vaults_admin)}</p>
              </>
            ) : (
              <p className="vault-select-prompt__subtitle">
                {displayText(authChrome.select_vault_subtitle)}
              </p>
            )}
          </div>
        </main>
      </div>
    );
  }

  const onVaultHome = location.pathname === "/" || location.pathname === "";
  const holdLandingOutlet = shouldHoldDefaultLandingOutlet({
    hold: landingHold,
    pathname: location.pathname,
    navReady: Boolean(nav) || Boolean(navError),
    landingRoute: nav?.default_landing_route,
  });
  const activeTab =
    tabMatch?.params.tabApiName ??
    searchParams.get("tab") ??
    (onVaultHome ? undefined : getLastTab(vaultId));
  const activePageApiName = pageMatch?.params.pageApiName;

  return (
    <UiProvider displayContext={nav?.display_context} shell={nav?.chrome}>
      <DisplayLocaleAntdBridge>
      <div className="app-shell">
        <header className="app-header">
          <div className="app-header__start">
            <Link to="/" className="app-header__brand" aria-label="Vivarcus">
              <AppHeaderLogo vaultId={vaultId} />
            </Link>
          </div>
          <div className="app-header__center">
            <GlobalHeaderSearch vaultId={vaultId} />
          </div>
          <HeaderMenus
            vaultLabel={vaultLabel}
            vaultId={vaultId}
            canViewUserProfile={nav?.capabilities?.can_view_user_profile === true}
          />
        </header>
        <TabNav
          vaultId={vaultId}
          nav={nav}
          activeTab={activeTab}
          activePageApiName={activePageApiName}
          isAdminRoute={isAdminRoute}
          isBusinessAdminRoute={isBusinessAdminRoute}
          onCollectionSwitch={refetch}
        />
        <main className="app-main">
          <Suspense fallback={<RouteFallback />}>
            {holdLandingOutlet ? <RouteFallback /> : <Outlet />}
          </Suspense>
        </main>
        <VaultAIChatPanel
          open={vaultAIOpen}
          vaultId={vaultId}
          objectName={recordMatch?.params.objectName}
          recordId={recordMatch?.params.recordId}
          onClose={() => setVaultAIOpen(false)}
          onNavigateToPage={pageNavigator ?? undefined}
        />
      </div>
      </DisplayLocaleAntdBridge>
    </UiProvider>
  );
}

export function AppShell() {
  const { session } = useAuth();
  const vaultId = session?.selectedVaultId;
  const location = useLocation();

  return (
    <LoginHostSessionGate
      session={session}
      pathname={location.pathname}
      search={location.search}
    >
      <NavigationProvider vaultId={vaultId ?? undefined}>
        <VaultAIProvider>
          <AppShellBody />
        </VaultAIProvider>
      </NavigationProvider>
    </LoginHostSessionGate>
  );
}
