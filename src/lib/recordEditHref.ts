/** Builds the SPA path that opens a record detail page in edit mode. */
export function recordEditHref(
  objectName: string,
  recordId: string,
  opts?: { tabApiName?: string; layout?: string; pageApiName?: string },
): string {
  const params = new URLSearchParams();
  if (opts?.layout) params.set("layout", opts.layout);
  if (opts?.tabApiName) params.set("tab", opts.tabApiName);
  if (opts?.pageApiName) params.set("page", opts.pageApiName);
  const suffix = params.toString() ? `?${params}` : "";
  return `/objects/${encodeURIComponent(objectName)}/records/${encodeURIComponent(recordId)}/edit${suffix}`;
}

/** Strips a trailing `/edit` segment from a record detail pathname. */
export function recordViewPathname(pathname: string): string {
  return pathname.replace(/\/edit\/?$/, "") || pathname;
}
