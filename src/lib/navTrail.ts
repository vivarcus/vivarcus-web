/**
 * Unified "where did I come from" context for breadcrumbs and cancel/back targets.
 *
 * A trail is an ordered list of ancestor hops carried in the `from` query param.
 * It replaces the ad-hoc `return_to` / `returnTo` params so that any page can
 * render the full path back and any create form can return to its origin.
 */

export const NAV_TRAIL_PARAM = "from";

/** Trails deeper than this are truncated from the front to keep URLs bounded. */
export const NAV_TRAIL_MAX_HOPS = 3;

const MAX_LABEL_LENGTH = 80;

export type NavTrailHop = {
  /** SPA-internal path (must start with `/`), without its own `from` param. */
  href: string;
  label: string;
};

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(raw: string): string {
  const padded = raw + "=".repeat((4 - (raw.length % 4)) % 4);
  const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

/** Rejects protocol-relative and absolute URLs so a trail can never drive an off-site redirect. */
function isInternalHref(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//");
}

function normalizeHop(raw: unknown): NavTrailHop | null {
  if (!Array.isArray(raw) || raw.length < 2) {
    return null;
  }
  const [href, label] = raw;
  if (typeof href !== "string" || typeof label !== "string") {
    return null;
  }
  const trimmedHref = href.trim();
  const trimmedLabel = label.trim();
  if (!trimmedHref || !trimmedLabel || !isInternalHref(trimmedHref)) {
    return null;
  }
  return { href: trimmedHref, label: trimmedLabel.slice(0, MAX_LABEL_LENGTH) };
}

export function decodeNavTrail(raw: string | null | undefined): NavTrailHop[] {
  const token = raw?.trim();
  if (!token) {
    return [];
  }
  try {
    const parsed = JSON.parse(fromBase64Url(token)) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map(normalizeHop)
      .filter((hop): hop is NavTrailHop => hop !== null)
      .slice(-NAV_TRAIL_MAX_HOPS);
  } catch {
    return [];
  }
}

export function encodeNavTrail(hops: NavTrailHop[]): string {
  const valid = hops
    .map((hop) => normalizeHop([hop.href, hop.label]))
    .filter((hop): hop is NavTrailHop => hop !== null)
    .slice(-NAV_TRAIL_MAX_HOPS);
  if (!valid.length) {
    return "";
  }
  return toBase64Url(JSON.stringify(valid.map((hop) => [hop.href, hop.label])));
}

/** Removes the trail param from a query string, so a hop never nests its own ancestors. */
export function stripNavTrailParam(search: string): string {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  params.delete(NAV_TRAIL_PARAM);
  const suffix = params.toString();
  return suffix ? `?${suffix}` : "";
}

/** Attaches an encoded trail to a target href, replacing any trail the href already carries. */
export function withNavTrail(href: string, encodedTrail: string): string {
  const [path, search = ""] = href.split("?");
  const params = new URLSearchParams(search);
  params.delete(NAV_TRAIL_PARAM);
  if (encodedTrail) {
    params.set(NAV_TRAIL_PARAM, encodedTrail);
  }
  const suffix = params.toString();
  return suffix ? `${path}?${suffix}` : path;
}

/**
 * Encoded trail carried by a query string, for handing an existing trail down
 * to a page whose innermost origin is already known from server context.
 */
export function readNavTrailParam(search: string): string {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return params.get(NAV_TRAIL_PARAM) ?? "";
}

/**
 * Builds the trail to hand to a page being opened from the current location:
 * the current trail plus the current page as its newest hop.
 */
export function pushNavTrail(
  currentSearch: string,
  hop: { pathname: string; search?: string; label: string },
): string {
  const params = new URLSearchParams(
    currentSearch.startsWith("?") ? currentSearch.slice(1) : currentSearch,
  );
  const hops = decodeNavTrail(params.get(NAV_TRAIL_PARAM));
  const href = `${hop.pathname}${stripNavTrailParam(hop.search ?? currentSearch)}`;
  return encodeNavTrail([...hops, { href, label: hop.label }]);
}

/** Href of the newest hop, i.e. the page a Cancel/Back action should return to. */
export function navTrailBackHref(hops: NavTrailHop[]): string | undefined {
  if (!hops.length) {
    return undefined;
  }
  const last = hops[hops.length - 1];
  return withNavTrail(last.href, encodeNavTrail(hops.slice(0, -1)));
}

/**
 * Renders hops as breadcrumb entries. Each ancestor links back with the trail
 * truncated to its own ancestors, so the crumb bar shrinks as you climb.
 */
export function navTrailBreadcrumbItems(hops: NavTrailHop[]): { label: string; to: string }[] {
  return hops.map((hop, index) => ({
    label: hop.label,
    to: withNavTrail(hop.href, encodeNavTrail(hops.slice(0, index))),
  }));
}
