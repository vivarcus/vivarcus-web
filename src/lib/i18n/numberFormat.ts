import { defaultDisplayContext } from "./types";
import type { DisplayContext } from "./types";
import { normalizeIntlLocale } from "./dateFormat";

export type LocaleNumberParts = {
  group: string;
  decimal: string;
};

function resolveLocale(ctx?: DisplayContext): string {
  return normalizeIntlLocale(ctx?.locale) || defaultDisplayContext.locale;
}

/** Grouping and decimal separators for a BCP47 locale. */
export function localeNumberParts(locale: string): LocaleNumberParts {
  try {
    const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
    return {
      group: parts.find((part) => part.type === "group")?.value ?? ",",
      decimal: parts.find((part) => part.type === "decimal")?.value ?? ".",
    };
  } catch {
    return { group: ",", decimal: "." };
  }
}

/** Formats a finite number with the user's locale grouping / decimal separators. */
export function formatNumberDisplayValue(
  value: number,
  ctx?: DisplayContext,
  scale?: number,
): string {
  const locale = resolveLocale(ctx);
  try {
    return new Intl.NumberFormat(locale, {
      maximumFractionDigits: scale != null && scale >= 0 ? scale : 20,
      minimumFractionDigits: 0,
    }).format(value);
  } catch {
    return String(value);
  }
}

/**
 * Parses a locale-formatted number string (grouping / decimal) into a
 * canonical JavaScript numeric string (`.` decimal, no grouping).
 */
export function parseLocaleNumberInput(raw: string, locale: string): string {
  if (!raw) {
    return "";
  }
  const { group, decimal } = localeNumberParts(locale);
  let text = raw.replace(/\u202f/g, " ");
  if (group && group !== decimal) {
    text = text.split(group).join("");
  }
  const keepTrailingDecimal = Boolean(decimal && text.endsWith(decimal));
  if (decimal && decimal !== ".") {
    const index = text.indexOf(decimal);
    if (index >= 0) {
      text = `${text.slice(0, index)}.${text.slice(index + decimal.length)}`;
    }
  }
  text = text.replace(/[^\d.+-]/g, "");
  if (keepTrailingDecimal && !text.endsWith(".")) {
    text += ".";
  }
  return text;
}
