import type { VaultRef } from "../api/types";

export const SESSION_KEY = "vivarcus.session_token";
const USER_KEY = "vivarcus.user_id";
const USERNAME_KEY = "vivarcus.username";
const DOMAIN_KEY = "vivarcus.home_domain_id";
const VAULTS_KEY = "vivarcus.vaults";
export const SELECTED_VAULT_KEY = "vivarcus.selected_vault_id";
export const VAULT_COOKIE_NAME = "vivarcus_vault_id";

const AUTH_KEYS = [
  SESSION_KEY,
  USER_KEY,
  USERNAME_KEY,
  DOMAIN_KEY,
  VAULTS_KEY,
  SELECTED_VAULT_KEY,
] as const;

const authStorage = localStorage;

function vaultCookieSuffix(): string {
  const secure =
    typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  return `; path=/; SameSite=Lax${secure}`;
}

function syncVaultCookie(vaultId: string | null) {
  if (typeof document === "undefined") return;
  if (vaultId) {
    document.cookie = `${VAULT_COOKIE_NAME}=${encodeURIComponent(vaultId)}${vaultCookieSuffix()}`;
    return;
  }
  document.cookie = `${VAULT_COOKIE_NAME}=; Max-Age=0${vaultCookieSuffix()}`;
}

/** Full document navigation so gateway can route the next shell/assets by vault cookie. */
export function replaceDocument(path: string) {
  if (typeof window === "undefined") return;
  const next = path.startsWith("/") ? path : `/${path}`;
  window.location.replace(next);
}

function migrateAuthFromSessionStorage() {
  if (authStorage.getItem(SESSION_KEY)) return;
  if (!sessionStorage.getItem(SESSION_KEY)) return;
  for (const key of AUTH_KEYS) {
    const value = sessionStorage.getItem(key);
    if (value !== null) {
      authStorage.setItem(key, value);
    }
  }
}

export type SessionState = {
  sessionToken: string;
  userId: string;
  username?: string;
  homeDomainId: string;
  vaults: VaultRef[];
  selectedVaultId: string | null;
};

export function resolveSelectedVaultId(
  vaults: VaultRef[],
  defaultVaultId?: string | null,
  sessionSelectedId?: string | null,
): string | null {
  if (
    sessionSelectedId &&
    vaults.some((v) => v.vault_id === sessionSelectedId)
  ) {
    return sessionSelectedId;
  }
  if (
    defaultVaultId &&
    vaults.some((v) => v.vault_id === defaultVaultId)
  ) {
    return defaultVaultId;
  }
  return null;
}

export function getSessionToken(): string | null {
  migrateAuthFromSessionStorage();
  return authStorage.getItem(SESSION_KEY);
}

export function loadSession(): SessionState | null {
  migrateAuthFromSessionStorage();
  const sessionToken = authStorage.getItem(SESSION_KEY);
  const userId = authStorage.getItem(USER_KEY);
  const homeDomainId = authStorage.getItem(DOMAIN_KEY);
  const vaultsRaw = authStorage.getItem(VAULTS_KEY);
  if (!sessionToken || !userId || !homeDomainId || !vaultsRaw) {
    return null;
  }
  let vaults: VaultRef[] = [];
  try {
    vaults = JSON.parse(vaultsRaw) as VaultRef[];
  } catch {
    return null;
  }
  const selectedFromStorage = authStorage.getItem(SELECTED_VAULT_KEY);
  const selectedVaultId = resolveSelectedVaultId(vaults, null, selectedFromStorage);
  syncVaultCookie(selectedVaultId);
  return {
    sessionToken,
    userId,
    username: authStorage.getItem(USERNAME_KEY) ?? undefined,
    homeDomainId,
    vaults,
    selectedVaultId,
  };
}

export function saveSession(input: {
  sessionToken: string;
  userId: string;
  username?: string;
  homeDomainId: string;
  vaults: VaultRef[];
}) {
  authStorage.setItem(SESSION_KEY, input.sessionToken);
  authStorage.setItem(USER_KEY, input.userId);
  if (input.username?.trim()) {
    authStorage.setItem(USERNAME_KEY, input.username.trim());
  } else {
    authStorage.removeItem(USERNAME_KEY);
  }
  authStorage.setItem(DOMAIN_KEY, input.homeDomainId);
  authStorage.setItem(VAULTS_KEY, JSON.stringify(input.vaults));
}

export function updateVaults(vaults: VaultRef[]) {
  authStorage.setItem(VAULTS_KEY, JSON.stringify(vaults));
}

export function setSelectedVault(vaultId: string) {
  authStorage.setItem(SELECTED_VAULT_KEY, vaultId);
  syncVaultCookie(vaultId);
}

export function clearSelectedVault() {
  authStorage.removeItem(SELECTED_VAULT_KEY);
  syncVaultCookie(null);
}

export function clearSession() {
  for (const key of AUTH_KEYS) {
    authStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
  syncVaultCookie(null);
}

export function formatCellValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
