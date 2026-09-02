import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { DisplayContext } from "../api/types";
import { api } from "../api/client";
import { defaultAuthChrome, defaultDisplayContext, type AuthChrome } from "../lib/i18n";
import { AuthContext } from "./authContext";
import { saveRememberedUser } from "./rememberedUser";
import {
  clearSelectedVault,
  clearSession,
  loadSession,
  replaceDocument,
  resolveSelectedVaultId,
  saveSession,
  SESSION_KEY,
  setSelectedVault,
  updateVaults as persistVaults,
  type SessionState,
} from "./session";

export { useAuth } from "./authContext";

function applySelectedVault(vaultId: string) {
  setSelectedVault(vaultId);
  void api.recordSelectedVault(vaultId).catch(() => {});
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState | null>(() => loadSession());
  const [authChrome, setAuthChrome] = useState<AuthChrome>(defaultAuthChrome);
  const [authDisplayContext, setAuthDisplayContext] = useState<DisplayContext>(defaultDisplayContext);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (!event.key?.startsWith("vivarcus.")) return;
      if (event.key === SESSION_KEY && event.newValue === null) {
        setSession(null);
        setAuthChrome(defaultAuthChrome);
        setAuthDisplayContext(defaultDisplayContext);
        return;
      }
      setSession(loadSession());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Cross-subdomain handoff: ?handoff=ticket on vault host after login.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ticket = params.get("handoff")?.trim();
    if (!ticket) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.consumeVaultHandoff(ticket);
        if (cancelled) return;
        saveSession({
          sessionToken: res.session_token,
          userId: res.user_id,
          homeDomainId: res.home_domain_id,
          vaults: res.vaults,
        });
        if (res.chrome) setAuthChrome(res.chrome);
        if (res.display_context) setAuthDisplayContext(res.display_context);
        const selectedVaultId = resolveSelectedVaultId(
          res.vaults,
          res.default_vault_id,
        );
        if (selectedVaultId) {
          applySelectedVault(selectedVaultId);
        }
        params.delete("handoff");
        const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}${window.location.hash}`;
        if (selectedVaultId) {
          replaceDocument(next || "/");
          return;
        }
        window.history.replaceState({}, "", next);
      } catch {
        // Leave URL; user can re-login from login host.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedVault = useMemo(() => {
    if (!session?.selectedVaultId) return null;
    return session.vaults.find((v) => v.vault_id === session.selectedVaultId) ?? null;
  }, [session]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.login(username, password);
    const trimmedUsername = username.trim();
    saveSession({
      sessionToken: res.session_token,
      userId: res.user_id,
      username: trimmedUsername,
      homeDomainId: res.home_domain_id,
      vaults: res.vaults,
    });
    saveRememberedUser(trimmedUsername);
    if (res.chrome) setAuthChrome(res.chrome);
    if (res.display_context) setAuthDisplayContext(res.display_context);
    const selectedVaultId = resolveSelectedVaultId(
      res.vaults,
      res.default_vault_id,
    );
    if (selectedVaultId) {
      applySelectedVault(selectedVaultId);
    }
    const next: SessionState = {
      sessionToken: res.session_token,
      userId: res.user_id,
      username: trimmedUsername || undefined,
      homeDomainId: res.home_domain_id,
      vaults: res.vaults,
      selectedVaultId,
    };
    setSession(next);
    return selectedVaultId;
  }, []);

  const completeOAuthSession = useCallback(async (sessionToken: string) => {
    // Persist token first so api.meVaults can authorize.
    saveSession({
      sessionToken,
      userId: "",
      homeDomainId: "",
      vaults: [],
    });
    const res = await api.meVaults();
    let username: string | undefined;
    try {
      const identity = await api.meIdentity();
      username = identity.username?.trim() || undefined;
    } catch {
      // Remembered-user cookie is best-effort for OAuth.
    }
    saveSession({
      sessionToken,
      userId: res.user_id,
      username,
      homeDomainId: res.home_domain_id,
      vaults: res.vaults,
    });
    if (username) saveRememberedUser(username);
    if (res.chrome) setAuthChrome(res.chrome);
    if (res.display_context) setAuthDisplayContext(res.display_context);
    const selectedVaultId = resolveSelectedVaultId(
      res.vaults,
      res.default_vault_id,
    );
    if (selectedVaultId) {
      applySelectedVault(selectedVaultId);
    }
    setSession({
      sessionToken,
      userId: res.user_id,
      username,
      homeDomainId: res.home_domain_id,
      vaults: res.vaults,
      selectedVaultId,
    });
    return selectedVaultId;
  }, []);

  const logout = useCallback(async () => {
    const vaultId = session?.selectedVaultId ?? undefined;
    try {
      await api.logout(vaultId ?? undefined);
    } catch {
      // Always clear local session even if revoke/audit logging fails.
    }
    clearSession();
    const { isLoginHost, loadPublicAuthConfig } = await import("../lib/vaultDns");
    const { loginPortalURL } = await import("../lib/vaultHostNav");
    try {
      const cfg = await loadPublicAuthConfig(() => api.publicAuthConfig());
      const base = cfg.vault_dns_base;
      if (base && !isLoginHost(window.location.hostname, base)) {
        window.location.replace(loginPortalURL(base));
        return;
      }
    } catch {
      // Same-origin login shell.
    }
    replaceDocument("/login");
  }, [session?.selectedVaultId]);

  const selectVault = useCallback(async (vaultId: string, landing?: string) => {
    const { switchVaultHostIfConfigured } = await import("../lib/vaultHostNav");
    const vaults = loadSession()?.vaults ?? [];
    if (await switchVaultHostIfConfigured(vaultId, vaults)) {
      return;
    }
    applySelectedVault(vaultId);
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    replaceDocument(landing ?? (current || "/"));
  }, []);

  const clearVaultSelection = useCallback(() => {
    clearSelectedVault();
    replaceDocument("/");
  }, []);

  const refreshVaults = useCallback(async () => {
    const res = await api.meVaults();
    persistVaults(res.vaults);
    if (res.chrome) setAuthChrome(res.chrome);
    if (res.display_context) setAuthDisplayContext(res.display_context);
    const previousSelected = session?.selectedVaultId ?? null;
    const selectedVaultId = resolveSelectedVaultId(
      res.vaults,
      res.default_vault_id,
      previousSelected,
    );
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        userId: res.user_id,
        homeDomainId: res.home_domain_id,
        vaults: res.vaults,
        selectedVaultId,
      };
    });
    if (selectedVaultId && selectedVaultId !== previousSelected) {
      applySelectedVault(selectedVaultId);
      replaceDocument(
        `${window.location.pathname}${window.location.search}${window.location.hash}` || "/",
      );
    }
  }, [session?.selectedVaultId]);

  const value = useMemo(
    () => ({
      session,
      authChrome,
      authDisplayContext,
      login,
      completeOAuthSession,
      logout,
      selectVault,
      clearVaultSelection,
      refreshVaults,
      selectedVault,
    }),
    [
      session,
      authChrome,
      authDisplayContext,
      login,
      completeOAuthSession,
      logout,
      selectVault,
      clearVaultSelection,
      refreshVaults,
      selectedVault,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
