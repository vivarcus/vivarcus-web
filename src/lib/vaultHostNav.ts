import { api } from "../api/client";
import type { VaultRef } from "../api/types";
import {
  hostnameMatchesVaultDns,
  isLoginHost,
  loadPublicAuthConfig,
  vaultHostForDns,
} from "./vaultDns";

/**
 * After login on login.{base}, jump to https://{dns}.{base}{path}?handoff=ticket.
 * Returns true when a cross-host navigation was started (caller should not navigate locally).
 */
export async function redirectToVaultHostIfConfigured(
  vaultId: string | null | undefined,
  vaults: VaultRef[],
  landingPath: string,
): Promise<boolean> {
  if (!vaultId) return false;
  const cfg = await loadPublicAuthConfig(() => api.publicAuthConfig());
  const base = cfg.vault_dns_base;
  if (!base) return false;
  if (!isLoginHost(window.location.hostname, base)) return false;

  const vault = vaults.find((v) => v.vault_id === vaultId);
  const dns = vault?.dns?.trim();
  if (!dns) return false;

  const { ticket, vault_host: vaultHost } = await api.issueVaultHandoff(vaultId);
  const host = vaultHost || vaultHostForDns(dns, base);
  if (!host) return false;

  const path = landingPath.startsWith("/") ? landingPath : `/${landingPath}`;
  const url = new URL(path, host.endsWith("/") ? host : `${host}/`);
  url.searchParams.set("handoff", ticket);
  window.location.replace(url.toString());
  return true;
}

/**
 * Authenticated users on login.{base} should use the vault host (login is auth-only).
 * Preserves the current path (e.g. /tabs/studies__c) across handoff.
 */
export async function redirectFromLoginHostIfConfigured(
  vaultId: string | null | undefined,
  vaults: VaultRef[],
  pathWithSearch: string,
): Promise<boolean> {
  const path = pathWithSearch.startsWith("/") ? pathWithSearch : `/${pathWithSearch}`;
  return redirectToVaultHostIfConfigured(vaultId, vaults, path);
}

/** Switch vault by changing host when DNS mode is on. */
export async function switchVaultHostIfConfigured(
  targetVaultId: string,
  vaults: VaultRef[],
): Promise<boolean> {
  const cfg = await loadPublicAuthConfig(() => api.publicAuthConfig());
  const base = cfg.vault_dns_base;
  if (!base) return false;

  const vault = vaults.find((v) => v.vault_id === targetVaultId);
  const dns = vault?.dns?.trim();
  if (!dns) return false;

  if (hostnameMatchesVaultDns(window.location.hostname, dns, base)) {
    return false;
  }

  const { ticket, vault_host: vaultHost } = await api.issueVaultHandoff(targetVaultId);
  const host = vaultHost || vaultHostForDns(dns, base);
  if (!host) return false;
  const url = new URL("/", host.endsWith("/") ? host : `${host}/`);
  url.searchParams.set("handoff", ticket);
  window.location.assign(url.toString());
  return true;
}

export function loginPortalURL(base: string): string {
  const scheme =
    typeof window !== "undefined" && window.location.protocol === "http:"
      ? "http"
      : "https";
  return `${scheme}://login.${base}/login`;
}
