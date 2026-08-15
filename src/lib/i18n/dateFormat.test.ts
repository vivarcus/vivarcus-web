import { describe, expect, it } from "vitest";
import {
  dateFieldPlaceholder,
  datePickerFormat,
  datePickerInputFormats,
  formatDateDisplayValue,
  formatDateFormatPreview,
  formatDateFormatRegionalPreviews,
  formatDateTimeDisplayValue,
  localeNumericDatePickerFormat,
  normalizeDateFormatProfile,
  normalizeDateInputText,
  normalizeIntlLocale,
  PREVIEW_WALL_CLOCK,
  utcInstantToWallClock,
  wallClockInstantInTimeZone,
  wallClockToUtcIso,
} from "./dateFormat";
import type { DisplayContext } from "./types";

const enUS: DisplayContext = {
  language: "en",
  locale: "en-US",
  timezone: "America/Los_Angeles",
  date_format_profile: "numeric",
};

describe("normalizeDateFormatProfile", () => {
  it("defaults unknown values to numeric", () => {
    expect(normalizeDateFormatProfile(undefined)).toBe("numeric");
    expect(normalizeDateFormatProfile("custom")).toBe("numeric");
  });

  it("accepts known profiles", () => {
    expect(normalizeDateFormatProfile("iso8601")).toBe("iso8601");
    expect(normalizeDateFormatProfile("Alphanumeric")).toBe("alphanumeric");
  });
});

describe("formatDateDisplayValue", () => {
  const sample = new Date(Date.UTC(2025, 0, 23, 12, 0, 0));

  it("formats numeric dates", () => {
    const text = formatDateDisplayValue(sample, enUS);
    expect(text).toMatch(/01/);
    expect(text).toMatch(/23/);
    expect(text).toMatch(/2025/);
  });

  it("formats iso8601 dates", () => {
    const text = formatDateDisplayValue(sample, { ...enUS, date_format_profile: "iso8601" });
    expect(text).toBe("2025-01-23");
  });

  it("formats alphanumeric dates", () => {
    const text = formatDateDisplayValue(sample, {
      ...enUS,
      date_format_profile: "alphanumeric",
    });
    expect(text).toMatch(/Jan/);
    expect(text).toMatch(/23/);
    expect(text).toMatch(/2025/);
  });
});

describe("formatDateTimeDisplayValue", () => {
  const sample = new Date("2025-01-23T17:29:00.000Z");

  it("includes timezone for numeric profile", () => {
    const text = formatDateTimeDisplayValue(sample, enUS);
    expect(text).toMatch(/2025/);
    expect(text).toMatch(/29|9/);
  });

  it("uses iso8601 date ordering", () => {
    const text = formatDateTimeDisplayValue(sample, {
      ...enUS,
      date_format_profile: "iso8601",
    });
    expect(text.startsWith("2025-01-23")).toBe(true);
  });
});

describe("normalizeIntlLocale", () => {
  it("converts Vault admin locale keys to BCP47", () => {
    expect(normalizeIntlLocale("en_al")).toBe("en-AL");
    expect(normalizeIntlLocale("en_us")).toBe("en-US");
    expect(normalizeIntlLocale("zh_CN")).toBe("zh-CN");
  });
});

describe("formatDateFormatPreview", () => {
  it("shows different output per profile for Vault admin locale keys", () => {
    const numeric = formatDateFormatPreview("numeric", "en_al", "UTC");
    const alphanumeric = formatDateFormatPreview("alphanumeric", "en_al", "UTC");
    const iso8601 = formatDateFormatPreview("iso8601", "en_al", "UTC");
    expect(numeric).not.toBe(alphanumeric);
    expect(iso8601.startsWith("2025-01-23")).toBe(true);
    expect(alphanumeric).toMatch(/Jan/);
  });

  it("anchors sample wall clock in preview timezone", () => {
    const text = formatDateFormatPreview("iso8601", "en-US", "America/Los_Angeles");
    expect(text.startsWith("2025-01-23")).toBe(true);
    expect(text).toMatch(/9:29/);
  });

  it("matches settings page sample", () => {
    const text = formatDateFormatPreview("alphanumeric", "en-US", "America/Los_Angeles");
    expect(text).toMatch(/Jan/);
    expect(text).toMatch(/2025/);
    expect(text).toMatch(/9:29/);
  });
});

describe("formatDateFormatRegionalPreviews", () => {
  it("returns USA, DEU, CHN, and JPN regional samples", () => {
    const rows = formatDateFormatRegionalPreviews("alphanumeric");
    expect(rows).toHaveLength(4);
    expect(rows.map((r) => r.code)).toEqual(["USA", "DEU", "CHN", "JPN"]);
    rows.forEach((row) => {
      expect(row.preview.length).toBeGreaterThan(0);
    });
  });

  it("formats China sample in Asia/Shanghai", () => {
    const rows = formatDateFormatRegionalPreviews("alphanumeric");
    const china = rows.find((r) => r.code === "CHN");
    expect(china?.label).toBe("CHN (CST)");
    expect(china?.preview).toMatch(/2025/);
    expect(china?.preview).toMatch(/9:29|09:29/);
  });
});

describe("utcInstantToWallClock and wallClockToUtcIso", () => {
  it("round-trips a stored UTC DateTime through the user timezone", () => {
    const stored = "2025-01-23T17:29:00.000Z";
    const instant = new Date(stored);
    const wall = utcInstantToWallClock(instant, enUS);
    expect(wall).toEqual({
      year: 2025,
      month: 1,
      day: 23,
      hour: 9,
      minute: 29,
    });
    expect(wallClockToUtcIso(wall, enUS)).toBe(stored);
  });
});

describe("wallClockInstantInTimeZone", () => {
  it("resolves Jan 23 2025 9:29 AM in America/Los_Angeles", () => {
    const instant = wallClockInstantInTimeZone(
      "America/Los_Angeles",
      PREVIEW_WALL_CLOCK,
    );
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    }).formatToParts(instant);
    const read = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((part) => part.type === type)?.value ?? NaN);
    expect(read("year")).toBe(2025);
    expect(read("month")).toBe(1);
    expect(read("day")).toBe(23);
    expect(read("hour")).toBe(9);
    expect(read("minute")).toBe(29);
  });
});

describe("datePickerFormat", () => {
  it("returns profile-specific patterns", () => {
    expect(datePickerFormat({ ...enUS, date_format_profile: "iso8601" }, false)).toBe(
      "YYYY-MM-DD",
    );
    expect(datePickerFormat({ ...enUS, date_format_profile: "alphanumeric" }, true)).toBe(
      "DD MMM YYYY HH:mm",
    );
  });

  it("uses locale-aware numeric patterns", () => {
    expect(datePickerFormat(enUS, false)).toBe("MM/DD/YYYY");
    expect(datePickerFormat({ ...enUS, locale: "en-GB" }, false)).toBe("DD/MM/YYYY");
    expect(datePickerFormat({ ...enUS, locale: "zh-CN" }, false)).toBe("YYYY/MM/DD");
    expect(datePickerFormat({ ...enUS, locale: "de-DE" }, false)).toBe("DD.MM.YYYY");
  });

  it("aligns numeric placeholder and picker format for non-US locales", () => {
    const ctx = { ...enUS, locale: "zh-CN" };
    expect(datePickerFormat(ctx, false)).toBe("YYYY/MM/DD");
    expect(dateFieldPlaceholder(ctx, false)).toMatch(/2025/);
    expect(dateFieldPlaceholder(ctx, false)).toMatch(/01/);
    expect(dateFieldPlaceholder(ctx, false)).toMatch(/23/);
  });
});

describe("datePickerInputFormats", () => {
  it("includes ISO storage format as a parse fallback for locale masks", () => {
    expect(datePickerInputFormats({ ...enUS, locale: "zh-CN" }, false)).toEqual([
      "YYYY/MM/DD",
      "YYYY/M/D",
      "YYYY-MM-DD",
      "YYYY-M-D",
      "MM/DD/YYYY",
      "M/D/YYYY",
    ]);
    expect(datePickerInputFormats({ ...enUS, date_format_profile: "iso8601" }, false)).toEqual([
      "YYYY-MM-DD",
      "YYYY-M-D",
      "YYYY/MM/DD",
      "YYYY/M/D",
      "MM/DD/YYYY",
      "M/D/YYYY",
    ]);
  });
});

describe("normalizeDateInputText", () => {
  it("strips clipboard whitespace and narrow no-break spaces", () => {
    expect(normalizeDateInputText("2026-06-25\n")).toBe("2026-06-25");
    expect(normalizeDateInputText("\u202f2026/06/25\r\n")).toBe("2026/06/25");
  });
});

describe("localeNumericDatePickerFormat", () => {
  it("includes locale time separators and 12-hour clock when applicable", () => {
    const us = localeNumericDatePickerFormat("en-US", true);
    expect(us).toMatch(/MM\/DD\/YYYY/);
    expect(us).toMatch(/h:mm/);
    expect(us).toMatch(/A$/);
  });
});

describe("dateFieldPlaceholder", () => {
  it("returns a formatted sample", () => {
    expect(dateFieldPlaceholder(enUS, false)).toMatch(/2025/);
  });
});
