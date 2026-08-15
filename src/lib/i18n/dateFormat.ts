import type { DisplayContext } from "./types";
import { defaultDisplayContext } from "./types";

export type DateFormatProfile = "numeric" | "alphanumeric" | "iso8601";

export type WallClock = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

/** Fixed wall clock used for Language & Region Settings preview (matches Veeva spec sample). */
export const PREVIEW_WALL_CLOCK: WallClock = {
  year: 2025,
  month: 1,
  day: 23,
  hour: 9,
  minute: 29,
};

export function normalizeDateFormatProfile(profile?: string): DateFormatProfile {
  const normalized = (profile ?? defaultDisplayContext.date_format_profile ?? "numeric")
    .trim()
    .toLowerCase();
  if (normalized === "alphanumeric" || normalized === "iso8601") {
    return normalized;
  }
  return "numeric";
}

/** Converts Vault locale codes (en_us, en-US) to BCP47 tags for Intl APIs. */
export function normalizeIntlLocale(locale?: string): string {
  const trimmed = (locale ?? "").trim();
  if (!trimmed) {
    return defaultDisplayContext.locale;
  }
  if (trimmed.includes("-") && !trimmed.includes("_")) {
    const parts = trimmed.split("-");
    if (parts.length === 1) {
      return parts[0].toLowerCase();
    }
    return `${parts[0].toLowerCase()}-${formatIntlLocaleSubtags(parts.slice(1))}`;
  }
  const parts = trimmed.split("_");
  const language = parts[0].toLowerCase();
  if (parts.length === 1) {
    return language;
  }
  return `${language}-${formatIntlLocaleSubtags(parts.slice(1))}`;
}

function formatIntlLocaleSubtags(subtags: string[]): string {
  return subtags
    .map((subtag) => {
      if (subtag.length <= 3) {
        return subtag.toUpperCase();
      }
      return subtag.charAt(0).toUpperCase() + subtag.slice(1).toLowerCase();
    })
    .join("-");
}

function resolveLocale(ctx?: DisplayContext): string {
  return normalizeIntlLocale(ctx?.locale) || defaultDisplayContext.locale;
}

function resolveTimezone(ctx?: DisplayContext): string {
  return ctx?.timezone?.trim() || defaultDisplayContext.timezone;
}

function wallClockParts(
  date: Date,
  timeZone: string,
): { year: number; month: number; day: number; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? NaN);
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
  };
}

/** Reads a UTC instant as wall-clock parts in the user's timezone. */
export function utcInstantToWallClock(
  date: Date,
  ctx?: DisplayContext,
): WallClock {
  const parts = wallClockParts(date, resolveTimezone(ctx));
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
  };
}

/** Serializes a wall-clock time in the user's timezone to a UTC ISO-8601 string. */
export function wallClockToUtcIso(wall: WallClock, ctx?: DisplayContext): string {
  return wallClockInstantInTimeZone(resolveTimezone(ctx), wall).toISOString();
}

/** Maps a wall-clock time in an IANA zone to a UTC Date instant. */
export function wallClockInstantInTimeZone(timeZone: string, wall: WallClock): Date {
  const zone = timeZone.trim() || defaultDisplayContext.timezone;
  const anchor = Date.UTC(wall.year, wall.month - 1, wall.day, 0, 0, 0);
  for (let deltaMin = -24 * 60; deltaMin <= 48 * 60; deltaMin++) {
    const candidate = new Date(anchor + deltaMin * 60_000);
    const parts = wallClockParts(candidate, zone);
    if (
      parts.year === wall.year &&
      parts.month === wall.month &&
      parts.day === wall.day &&
      parts.hour === wall.hour &&
      parts.minute === wall.minute
    ) {
      return candidate;
    }
  }
  return new Date(Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute));
}

function datePartOptions(profile: DateFormatProfile): Intl.DateTimeFormatOptions {
  if (profile === "alphanumeric") {
    return { year: "numeric", month: "short", day: "2-digit" };
  }
  return { year: "numeric", month: "2-digit", day: "2-digit" };
}

function formatIso8601Date(
  date: Date,
  locale: string,
  timeZone?: string,
): string {
  const parts = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(timeZone ? { timeZone } : {}),
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  return `${year}-${month}-${day}`;
}

/** Formats a Date field value for display. */
export function formatDateDisplayValue(
  date: Date,
  ctx: DisplayContext | undefined,
): string {
  const locale = resolveLocale(ctx);
  const profile = normalizeDateFormatProfile(ctx?.date_format_profile);
  try {
    if (profile === "iso8601") {
      return formatIso8601Date(date, locale, "UTC");
    }
    return new Intl.DateTimeFormat(locale, {
      ...datePartOptions(profile),
      timeZone: "UTC",
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

/** Formats a DateTime field value for display. */
export function formatDateTimeDisplayValue(
  date: Date,
  ctx: DisplayContext | undefined,
): string {
  const locale = resolveLocale(ctx);
  const timezone = resolveTimezone(ctx);
  const profile = normalizeDateFormatProfile(ctx?.date_format_profile);
  try {
    if (profile === "iso8601") {
      const time = new Intl.DateTimeFormat(locale, {
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
        timeZone: timezone,
      }).format(date);
      return `${formatIso8601Date(date, locale, timezone)} ${time}`;
    }
    return new Intl.DateTimeFormat(locale, {
      ...datePartOptions(profile),
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
      timeZone: timezone,
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

/** Preview string for Language & Region Settings (matches runtime DateTime formatting). */
export function formatDateFormatPreview(
  profile: string,
  locale: string,
  timeZone: string,
  wall: WallClock = PREVIEW_WALL_CLOCK,
): string {
  const sample = wallClockInstantInTimeZone(timeZone, wall);
  return formatDateTimeDisplayValue(sample, {
    locale,
    timezone: timeZone,
    date_format_profile: profile,
    language: "en",
  });
}

export type DateFormatRegionalPreview = {
  code: string;
  label: string;
  locale: string;
  timezone: string;
};

/** Regional samples shown on Language & Region Settings (Veeva USA/DEU/JPN + China). */
export const DATE_FORMAT_REGIONAL_PREVIEWS: DateFormatRegionalPreview[] = [
  { code: "USA", label: "USA (PST)", locale: "en-US", timezone: "America/Los_Angeles" },
  { code: "DEU", label: "DEU (MEZ)", locale: "de-DE", timezone: "Europe/Berlin" },
  { code: "CHN", label: "CHN (CST)", locale: "zh-CN", timezone: "Asia/Shanghai" },
  { code: "JPN", label: "JPN (JST)", locale: "ja-JP", timezone: "Asia/Tokyo" },
];

export function formatDateFormatRegionalPreviews(
  profile: string,
  wall: WallClock = PREVIEW_WALL_CLOCK,
): { code: string; label: string; preview: string }[] {
  return DATE_FORMAT_REGIONAL_PREVIEWS.map((region) => ({
    code: region.code,
    label: region.label,
    preview: formatDateFormatPreview(profile, region.locale, region.timezone, wall),
  }));
}

/** Distinct y/m/d/h/m sample for Intl formatToParts (2006-11-22 15:45 UTC). */
const LOCALE_FORMAT_SAMPLE = new Date(Date.UTC(2006, 10, 22, 15, 45, 0));

function intlPartToDayjsToken(
  part: Intl.DateTimeFormatPart,
  hour12: boolean,
): string {
  switch (part.type) {
    case "day":
      return part.value.length >= 2 ? "DD" : "D";
    case "month":
      return part.value.length >= 2 ? "MM" : "M";
    case "year":
      return part.value.length === 2 ? "YY" : "YYYY";
    case "hour":
      return hour12 ? "h" : part.value.length >= 2 ? "HH" : "H";
    case "minute":
      return "mm";
    case "second":
      return "ss";
    case "dayPeriod":
      return "A";
    case "literal":
      // Intl may emit narrow no-break spaces (U+202F); normalize for dayjs/Ant Design parsing.
      return part.value.replace(/\u202f/g, " ");
    default:
      return part.value;
  }
}

/** Derives a dayjs/Ant Design DatePicker mask from the user's locale (numeric profile). */
export function localeNumericDatePickerFormat(
  locale: string,
  includeTime: boolean,
): string {
  try {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      ...(includeTime ? { hour: "numeric", minute: "2-digit" } : {}),
    };
    const parts = new Intl.DateTimeFormat(locale, options).formatToParts(
      LOCALE_FORMAT_SAMPLE,
    );
    const hour12 = parts.some((part) => part.type === "dayPeriod");
    return parts.map((part) => intlPartToDayjsToken(part, hour12)).join("");
  } catch {
    return includeTime ? "MM/DD/YYYY HH:mm" : "MM/DD/YYYY";
  }
}

/** dayjs / Ant Design DatePicker display format for empty-field hints and editing. */
export function datePickerFormat(
  ctx: DisplayContext | undefined,
  includeTime: boolean,
): string {
  const profile = normalizeDateFormatProfile(ctx?.date_format_profile);
  if (includeTime) {
    switch (profile) {
      case "iso8601":
        return "YYYY-MM-DD HH:mm";
      case "alphanumeric":
        return "DD MMM YYYY HH:mm";
      default:
        return localeNumericDatePickerFormat(resolveLocale(ctx), true);
    }
  }
  switch (profile) {
    case "iso8601":
      return "YYYY-MM-DD";
    case "alphanumeric":
      return "DD MMM YYYY";
    default:
      return localeNumericDatePickerFormat(resolveLocale(ctx), false);
  }
}

const ISO_DATE_INPUT_FORMATS = ["YYYY-MM-DD", "YYYY-M-D"];
const SLASH_DATE_INPUT_FORMATS = ["YYYY/MM/DD", "YYYY/M/D"];
/** Common US numeric paste targets (docs / Excel), independent of personal locale. */
const US_DATE_INPUT_FORMATS = ["MM/DD/YYYY", "M/D/YYYY"];
const ISO_DATE_TIME_INPUT_FORMATS = [
  "YYYY-MM-DD HH:mm",
  "YYYY-MM-DDTHH:mm:ss",
  "YYYY-MM-DD HH:mm:ss",
  "YYYY-M-D HH:mm",
  ...ISO_DATE_INPUT_FORMATS,
];

/** Strips clipboard noise (trailing newline from Excel, NBSP) before DatePicker parse. */
export function normalizeDateInputText(raw: string): string {
  return raw.replace(/\u202f/g, " ").trim();
}

/** Adds unpadded month/day variants so pasted 2026/6/25 still matches YYYY/MM/DD masks. */
function withFlexibleDigitFormats(format: string): string[] {
  if (!format.includes("MM") && !format.includes("DD")) {
    return [format];
  }
  const flexible = format.replaceAll("MM", "M").replaceAll("DD", "D");
  return flexible === format ? [format] : [format, flexible];
}

/**
 * Accepted DatePicker input masks: locale/profile primary format plus ISO / slash /
 * US storage formats so pasted values like 2026-06-01 still parse under Numeric locales.
 */
export function datePickerInputFormats(
  ctx: DisplayContext | undefined,
  includeTime: boolean,
): string[] {
  const primary = datePickerFormat(ctx, includeTime);
  const fallbacks = includeTime
    ? ISO_DATE_TIME_INPUT_FORMATS
    : [...ISO_DATE_INPUT_FORMATS, ...SLASH_DATE_INPUT_FORMATS, ...US_DATE_INPUT_FORMATS];
  return [...new Set([...withFlexibleDigitFormats(primary), ...fallbacks])];
}

/** Placeholder text for empty Date / DateTime inputs. */
export function dateFieldPlaceholder(
  ctx: DisplayContext | undefined,
  includeTime: boolean,
): string {
  const timezone = resolveTimezone(ctx);
  if (includeTime) {
    const sample = wallClockInstantInTimeZone(timezone, PREVIEW_WALL_CLOCK);
    return formatDateTimeDisplayValue(sample, ctx);
  }
  const sample = new Date(Date.UTC(2025, 0, 23, 12, 0, 0));
  return formatDateDisplayValue(sample, ctx);
}
