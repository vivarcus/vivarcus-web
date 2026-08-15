/** Hash href used for in-chat page jump links. */
export const VAULT_AI_PAGE_HREF_PREFIX = "#vault-ai-page-";

const EXISTING_MD_CHUNK = /(\[[^\]]*\]\([^)]+\)|`[^`]+`)/;
// English page/p.N, Chinese 第N页 / 页面N (models often write 页面).
const PAGE_REF =
  /\b((?:[Pp]ages?|[Pp]\.)\s*)(\d+)\b|(第\s*)(\d+)(\s*页)|(页面\s*)(\d+)/g;
const PAGE_LINK_RE = new RegExp(
  `\\[([^\\]]+)\\]\\((${VAULT_AI_PAGE_HREF_PREFIX}\\d+)(?:\\?([^)]*))?\\)`,
  "g",
);
const PREV_SNIPPET_RE =
  /Previous\s*[:：]\s*(?:`([^`]+)`|[“"]([^”"]+)[”"]|([^\n]+))/i;
const CURR_SNIPPET_RE =
  /Current\s*[:：]\s*(?:`([^`]+)`|[“"]([^”"]+)[”"]|([^\n]+))/i;

export type VaultAIPageTarget = {
  page: number;
  query?: string;
};

/** Parse a vault-ai page jump href into page + optional highlight query. */
export function parseVaultAIPageHref(href: string | undefined | null): VaultAIPageTarget | null {
  if (!href) {
    return null;
  }
  const trimmed = href.trim();
  const m = new RegExp(`^${VAULT_AI_PAGE_HREF_PREFIX}(\\d+)(?:\\?(.*))?$`).exec(trimmed);
  if (!m) {
    return null;
  }
  const page = Number(m[1]);
  if (!Number.isFinite(page) || page < 1) {
    return null;
  }
  const query = parseHighlightQueryParam(m[2]);
  return query ? { page, query } : { page };
}

/**
 * Extract q= from a hash query string. Models often emit unescaped spaces
 * (`?q=foo bar`); URLSearchParams would truncate to the first word.
 */
export function parseHighlightQueryParam(raw: string | undefined | null): string | undefined {
  if (!raw) {
    return undefined;
  }
  // Prefer an explicit q= value spanning spaces until the next &param=.
  const m = /(?:^|&)q=([\s\S]*?)(?=&(?:[A-Za-z_][\w-]*=)|$)/.exec(raw);
  if (!m) {
    return undefined;
  }
  let q = m[1];
  try {
    q = decodeURIComponent(q.replace(/\+/g, " "));
  } catch {
    q = q.replace(/\+/g, " ");
  }
  q = q.trim();
  return q || undefined;
}

/**
 * Turn plain page citations into markdown page-jump links.
 * Does not invent highlight queries — those come from model-emitted
 * `#vault-ai-page-N?q=…` anchors, or from nearby Previous/Current quotes via
 * attachNearbyDiffHighlightQueries.
 */
export function linkifyVaultAIPageRefs(text: string): string {
  if (!text) {
    return text;
  }
  return text
    .split(EXISTING_MD_CHUNK)
    .map((part, index) => {
      if (index % 2 === 1) {
        return part;
      }
      return part.replace(
        PAGE_REF,
        (_full, engPrefix, engNum, zhPrefix, zhNum, zhSuffix, yePrefix, yeNum) => {
          if (engNum) {
            return `[${engPrefix}${engNum}](${VAULT_AI_PAGE_HREF_PREFIX}${engNum})`;
          }
          if (yeNum) {
            return `[${yePrefix}${yeNum}](${VAULT_AI_PAGE_HREF_PREFIX}${yeNum})`;
          }
          return `[${zhPrefix}${zhNum}${zhSuffix}](${VAULT_AI_PAGE_HREF_PREFIX}${zhNum})`;
        },
      );
    })
    .join("");
}

/**
 * For Version Compare replies that quote Previous/Current snippets next to a
 * page jump link, attach ?q= so the viewer can highlight the edited phrase.
 * Does not override an existing q= on the link unless it is a clear truncation
 * of the nearby phrase (see chooseHighlightQuery).
 */
export function attachNearbyDiffHighlightQueries(text: string): string {
  if (!text || !text.includes(VAULT_AI_PAGE_HREF_PREFIX)) {
    return text;
  }
  return text.replace(PAGE_LINK_RE, (full, label: string, pageHref: string, queryPart?: string) => {
    const existing = parseHighlightQueryParam(queryPart);
    // Prefer Previous/Current in the same list item after the link. A wide
    // look-behind pulls quotes from the previous bullet and mis-attaches them.
    const idx = text.indexOf(full);
    const after = text.slice(idx + full.length, Math.min(text.length, idx + full.length + 500));
    const before = text.slice(Math.max(0, idx - 40), idx);
    const window = before + "\n" + after;
    const prevMatch = window.match(PREV_SNIPPET_RE);
    const currMatch = window.match(CURR_SNIPPET_RE);
    const prev = (prevMatch?.[1] ?? prevMatch?.[2] ?? prevMatch?.[3] ?? "").trim();
    const curr = (currMatch?.[1] ?? currMatch?.[2] ?? currMatch?.[3] ?? "").trim();
    const nearby = pickHighlightQueryFromSnippets(prev, curr);
    const q = chooseHighlightQuery(existing, nearby);
    if (!q) {
      return full;
    }
    // Always re-emit with encodeURIComponent: models often leave raw spaces in
    // ?q=…, and CommonMark will not parse those as links (raw markdown shows).
    return formatVaultAIPageMarkdownLink(label, pageHref, q);
  });
}

/** Build a CommonMark-safe vault-ai page jump link (q percent-encoded). */
export function formatVaultAIPageMarkdownLink(
  label: string,
  pageHref: string,
  query?: string,
): string {
  if (!query) {
    return `[${label}](${pageHref})`;
  }
  return `[${label}](${pageHref}?q=${encodeURIComponent(query)})`;
}

/**
 * Re-encode ?q= on existing vault-ai page markdown links.
 * Needed when the model emits unescaped spaces/Unicode in the href — micromark
 * then leaves `[page N](#vault-ai-page-N?q=…)` as plain text.
 */
export function encodeVaultAIPageMarkdownQueries(text: string): string {
  if (!text || !text.includes(VAULT_AI_PAGE_HREF_PREFIX)) {
    return text;
  }
  return text.replace(PAGE_LINK_RE, (_full, label: string, pageHref: string, queryPart?: string) => {
    const q = parseHighlightQueryParam(queryPart);
    return formatVaultAIPageMarkdownLink(label, pageHref, q);
  });
}

/** Prefer a longer nearby phrase when the link q looks truncated. */
export function chooseHighlightQuery(existing: string | undefined, nearby: string): string {
  if (!nearby) {
    return existing ?? "";
  }
  if (!existing) {
    return nearby;
  }
  if (nearby === existing) {
    return existing;
  }
  // Unescaped multi-word q often collapses to the first token ("Informed" from
  // "Informed Consent Process 1"). Only upgrade when existing is clearly a
  // prefix/substring of nearby — never replace an unrelated short token such as
  // "certification" with Previous/Current quotes from a different change bullet.
  if (nearby.startsWith(existing) && [...nearby].length > [...existing].length) {
    return nearby;
  }
  if (!/\s/.test(existing) && nearby.includes(existing) && [...nearby].length > [...existing].length) {
    return nearby;
  }
  return existing;
}

/** Mirror backend differing-span highlight picker for in-chat Previous/Current quotes. */
export function pickHighlightQueryFromSnippets(prev: string, curr: string): string {
  const a = collapseWS(prev);
  const b = collapseWS(curr);
  if (!a && !b) {
    return "";
  }
  if (a === b) {
    return "";
  }
  // Prefer a phrase that appears on the Current side (viewer shows current version).
  const fromCurr = differingSpanQuery(b, a);
  if (fromCurr) {
    return normalizeHighlightQuery(fromCurr);
  }
  return normalizeHighlightQuery(differingSpanQuery(a, b));
}

function collapseWS(s: string): string {
  return s.trim().split(/\s+/).filter(Boolean).join(" ");
}

/** Collapse extract-noise spaces around hyphens/digits ("2026-07- 28" → "2026-07-28"). */
function normalizeHighlightQuery(s: string): string {
  const chars = [...collapseWS(s)];
  if (chars.length === 0) {
    return "";
  }
  const glue = (ch: string) => /[-–—/]/.test(ch);
  let out = "";
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (ch === " " && i > 0 && i + 1 < chars.length) {
      if (glue(chars[i - 1]) || glue(chars[i + 1])) {
        continue;
      }
    }
    out += ch;
  }
  return out;
}

function differingSpanQuery(source: string, other: string): string {
  if (!source) {
    return "";
  }
  if (!other) {
    return clipQuery(source);
  }
  let prefix = 0;
  while (prefix < source.length && prefix < other.length && source[prefix] === other[prefix]) {
    prefix += 1;
  }
  let suffix = 0;
  while (
    suffix < source.length - prefix &&
    suffix < other.length - prefix &&
    source[source.length - 1 - suffix] === other[other.length - 1 - suffix]
  ) {
    suffix += 1;
  }
  let diffStart = prefix;
  let diffEnd = source.length - suffix;
  if (diffEnd < diffStart) {
    diffEnd = diffStart;
  }
  const pad = diffEnd - diffStart < 3 ? 40 : 28;
  const start = Math.max(0, diffStart - pad);
  const end = Math.min(source.length, diffEnd + pad);
  return clipQuery(collapseWS(source.slice(start, end)));
}

function clipQuery(q: string): string {
  const chars = [...q];
  if (chars.length <= 64) {
    return q;
  }
  return chars.slice(0, 64).join("");
}

/** Linkify page refs, attach highlight queries, and percent-encode ?q= for CommonMark. */
export function prepareVaultAIAssistantMarkdown(text: string): string {
  return encodeVaultAIPageMarkdownQueries(
    attachNearbyDiffHighlightQueries(linkifyVaultAIPageRefs(text)),
  );
}
