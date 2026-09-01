import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import type { NotificationItem } from "../api/types";
import { richTextPlainText, sanitizeRichTextHtml } from "../renderers/richTextSanitize";

dayjs.extend(relativeTime);

const HTML_TAG_PATTERN = /<\s*\/?\s*(?:p|a|b|strong|em|i|u|s|ul|ol|li|br)\b/i;
const ESCAPED_HTML_PATTERN = /&lt;\s*\/?\s*(?:p|a|b|strong|em|i|u|s|ul|ol|li|br)\b/i;
const RELATIVE_TIME_MS = 24 * 60 * 60 * 1000;

/** In-app notifications store notification text in body; subject is the email title. */
export function notificationBodyText(item: NotificationItem): string {
  const body = item.body?.trim() ?? "";
  if (body) {
    return body;
  }
  return item.subject?.trim() ?? "";
}

/** Page heading: subject when it is distinct from the in-app body. */
export function notificationHeading(item: NotificationItem): string | undefined {
  const subject = item.subject?.trim() ?? "";
  const body = item.body?.trim() ?? "";
  if (!subject || !body || subject === body) {
    return undefined;
  }
  return subject;
}

export function notificationContainsHtml(text: string): boolean {
  return HTML_TAG_PATTERN.test(text) || ESCAPED_HTML_PATTERN.test(text);
}

function decodeNotificationHtmlEntities(text: string): string {
  if (!text.includes("&lt;") && !text.includes("&gt;") && !text.includes("&amp;")) {
    return text;
  }
  if (typeof document !== "undefined") {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = text;
    return textarea.value;
  }
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function sanitizeNotificationHtml(text: string): string {
  return sanitizeRichTextHtml(decodeNotificationHtmlEntities(text));
}

/** Sanitized HTML for in-app notification rendering, or null when body is plain text. */
export function prepareNotificationHtml(text: string): string | null {
  if (!notificationContainsHtml(text)) {
    return null;
  }
  const sanitized = sanitizeNotificationHtml(text);
  return sanitized || null;
}

export function notificationPlainText(text: string): string {
  if (!notificationContainsHtml(text)) {
    return text.trim();
  }
  return richTextPlainText(decodeNotificationHtmlEntities(text));
}

export function recordLinkLabel(targetUrl: string | undefined): string | undefined {
  const url = targetUrl?.trim();
  if (!url) {
    return undefined;
  }
  const match = url.match(/\/records\/([^/?#]+)/);
  return match?.[1];
}

/** Turn a trailing record name (or id) into an in-body HTML link, matching Veeva. */
export function embedRecordLink(text: string, targetUrl: string | undefined): string {
  const href = resolveInAppHref(targetUrl);
  if (!href) {
    return text;
  }
  if (notificationContainsHtml(text)) {
    return text;
  }
  const escapedHref = href.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const named = text.match(/^(.*?)([:：])\s*(\S[\s\S]*)$/);
  if (named?.[3]?.trim()) {
    return `${named[1]}${named[2]} <a href="${escapedHref}">${escapeHtml(named[3].trim())}</a>`;
  }
  if (/[:：]\s*$/.test(text)) {
    const label = recordLinkLabel(targetUrl);
    if (!label) {
      return text;
    }
    return `${text.replace(/[:：]+\s*$/, "")}: <a href="${escapedHref}">${escapeHtml(label)}</a>`;
  }
  return text;
}

export function notificationNeedsCollapse(text: string): boolean {
  const html = prepareNotificationHtml(text);
  if (html && /<(?:p|ul|ol|li|br)\b/i.test(html)) {
    const breaks = html.match(/<br\b|<\/p>|<\/li>/gi)?.length ?? 0;
    if (breaks >= 2) {
      return true;
    }
  }
  return notificationPlainText(text).length > 140;
}

export function formatNotificationTime(iso: string, now = Date.now()): string {
  const parsed = dayjs(iso);
  if (!parsed.isValid()) {
    return iso;
  }
  if (now - parsed.valueOf() < RELATIVE_TIME_MS) {
    return parsed.fromNow();
  }
  return parsed.format("D MMM YYYY");
}

export function formatNotificationDayHeading(iso: string): string {
  const parsed = dayjs(iso);
  if (!parsed.isValid()) {
    return iso;
  }
  return parsed.format("D MMM YYYY").toUpperCase();
}

export function resolveInAppHref(href: string | null | undefined): string | null {
  const raw = href?.trim() ?? "";
  if (!raw) {
    return null;
  }
  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return null;
    }
  }
  return raw.startsWith("/") ? raw : `/${raw}`;
}
