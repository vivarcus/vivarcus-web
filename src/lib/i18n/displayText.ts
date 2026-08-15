import type { DisplayText } from "./types";

/** Resolves API display text (i18n-ready object or legacy plain string). */
export function displayText(value: string | DisplayText | null | undefined, fallback = ""): string {
  if (value == null) return fallback;
  if (typeof value === "string") return value || fallback;
  return value.text || fallback;
}

/** Replaces `{name}` tokens in resolved display text. */
export function displayTextTemplate(
  value: string | DisplayText | null | undefined,
  vars: Record<string, string | number>,
  fallback = "",
): string {
  let text = displayText(value, fallback);
  for (const [key, raw] of Object.entries(vars)) {
    text = text.replaceAll(`{${key}}`, String(raw));
  }
  return text;
}

/** Returns stable resource key when present. */
export function displayTextKey(value: string | DisplayText | null | undefined): string | undefined {
  if (value == null || typeof value === "string") return undefined;
  return value.key;
}
