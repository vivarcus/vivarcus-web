/** Host-based Vault DNS routing (login.{base} → {dns}.{base}). */

export type PublicAuthConfig = {
  vault_dns_base: string;
  login_host?: string;
};

let cachedConfig: PublicAuthConfig | null = null;
let configPromise: Promise<PublicAuthConfig> | null = null;

export async function loadPublicAuthConfig(
  fetcher: () => Promise<PublicAuthConfig> = fetchPublicConfig,
): Promise<PublicAuthConfig> {
  if (cachedConfig) return cachedConfig;
  if (!configPromise) {
    configPromise = fetcher()
      .then((cfg) => {
        cachedConfig = {
          vault_dns_base: (cfg.vault_dns_base ?? "").trim().toLowerCase(),
          login_host: cfg.login_host?.trim().toLowerCase(),
        };
        return cachedConfig;
      })
      .catch(() => {
        cachedConfig = { vault_dns_base: "" };
        return cachedConfig;
      });
  }
  return configPromise;
}

async function fetchPublicConfig(): Promise<PublicAuthConfig> {
  const res = await fetch("/ui/auth/public-config");
  if (!res.ok) return { vault_dns_base: "" };
  return (await res.json()) as PublicAuthConfig;
}

/** Test helper. */
export function resetPublicAuthConfigCache() {
  cachedConfig = null;
  configPromise = null;
}

export function currentHostname(): string {
  if (typeof window === "undefined") return "";
  return window.location.hostname.toLowerCase();
}

export function isLoginHost(hostname: string, base: string): boolean {
  const b = base.trim().toLowerCase();
  if (!b) return false;
  return hostname.toLowerCase() === `login.${b}`;
}

export function vaultHostForDns(dns: string, base: string): string {
  const d = dns.trim().toLowerCase();
  const b = base.trim().toLowerCase();
  if (!d || !b) return "";
  const scheme =
    typeof window !== "undefined" && window.location.protocol === "http:"
      ? "http"
      : "https";
  return `${scheme}://${d}.${b}`;
}

export function hostnameMatchesVaultDns(
  hostname: string,
  dns: string,
  base: string,
): boolean {
  const d = dns.trim().toLowerCase();
  const b = base.trim().toLowerCase();
  if (!d || !b) return false;
  return hostname.toLowerCase() === `${d}.${b}`;
}

/** When on a vault host under base, return the dns slug; else null. */
export function vaultDnsFromHostname(hostname: string, base: string): string | null {
  const b = base.trim().toLowerCase();
  const h = hostname.toLowerCase();
  if (!b || !h.endsWith(`.${b}`)) return null;
  const slug = h.slice(0, -(b.length + 1));
  if (!slug || slug.includes(".") || slug === "login" || slug === "www") {
    return null;
  }
  return slug;
}
