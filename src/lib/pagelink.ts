export function vaultPagelinkHref(_vaultId: string, routePath: string, tabApiName?: string): string {
  const base = routePath.startsWith("/") ? routePath : `/${routePath}`;
  if (!tabApiName || routePath.startsWith("/pages/")) {
    return base;
  }
  const join = base.includes("?") ? "&" : "?";
  return `${base}${join}tab=${encodeURIComponent(tabApiName)}`;
}
