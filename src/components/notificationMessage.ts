import type { NotificationItem } from "../api/types";
import { richTextPlainText, sanitizeRichTextHtml } from "../renderers/richTextSanitize";

/** In-app notifications store notification text in body; subject is the email title. */
export function notificationBodyText(item: NotificationItem): string {
  const body = item.body?.trim() ?? "";
  if (body) {
    return body;
  }
  return item.subject?.trim() ?? "";
}

export function notificationContainsHtml(text: string): boolean {
  return text.includes("<");
}

export function sanitizeNotificationHtml(text: string): string {
  return sanitizeRichTextHtml(text);
}

export function notificationPlainText(text: string): string {
  if (!notificationContainsHtml(text)) {
    return text.trim();
  }
  return richTextPlainText(text);
}

export function recordLinkLabel(targetUrl: string | undefined): string | undefined {
  const url = targetUrl?.trim();
  if (!url) {
    return undefined;
  }
  const match = url.match(/\/records\/([^/?#]+)/);
  return match?.[1];
}

/** Veeva-style task rows end with ":" and show the record id as an inline link label. */
export function splitTaskInlineLink(
  text: string,
  targetUrl: string | undefined,
): { message: string; linkLabel?: string } {
  const linkLabel = recordLinkLabel(targetUrl);
  const showInlineLink = Boolean(linkLabel && targetUrl?.trim()) && /:\s*$/.test(text);
  if (!showInlineLink || !linkLabel) {
    return { message: text };
  }
  return {
    message: text.replace(/:+\s*$/, ""),
    linkLabel,
  };
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
