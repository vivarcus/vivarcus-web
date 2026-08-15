import DOMPurify from "dompurify";

const RICH_TEXT_ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "a",
] as const;

const RICH_TEXT_ALLOWED_ATTR = ["href", "target", "rel"] as const;

/** Sanitize stored RichText HTML for display or round-trip editing. */
export function sanitizeRichTextHtml(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) {
    return "";
  }
  return DOMPurify.sanitize(trimmed, {
    ALLOWED_TAGS: [...RICH_TEXT_ALLOWED_TAGS],
    ALLOWED_ATTR: [...RICH_TEXT_ALLOWED_ATTR],
  });
}

/** Plain-text summary for empty checks and list fallbacks. */
export function richTextPlainText(html: string): string {
  const sanitized = sanitizeRichTextHtml(html);
  if (!sanitized) {
    return "";
  }
  if (typeof document !== "undefined") {
    const node = document.createElement("div");
    node.innerHTML = sanitized;
    return (node.textContent ?? "").replace(/\s+/g, " ").trim();
  }
  return sanitized.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function isRichTextEmpty(html: unknown): boolean {
  if (html == null) {
    return true;
  }
  return richTextPlainText(String(html)) === "";
}
