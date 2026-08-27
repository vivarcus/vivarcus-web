import { describe, expect, it } from "vitest";
import {
  formatNumberDisplayValue,
  localeNumberParts,
  parseLocaleNumberInput,
} from "./numberFormat";

describe("localeNumberParts", () => {
  it("uses comma grouping and period decimal for en-US", () => {
    expect(localeNumberParts("en-US")).toEqual({ group: ",", decimal: "." });
  });

  it("uses period grouping and comma decimal for de-DE", () => {
    expect(localeNumberParts("de-DE")).toEqual({ group: ".", decimal: "," });
  });
});

describe("formatNumberDisplayValue", () => {
  it("groups thousands by locale", () => {
    expect(formatNumberDisplayValue(1234.5, { language: "en", locale: "en-US", timezone: "UTC" })).toBe(
      "1,234.5",
    );
    expect(formatNumberDisplayValue(1234.5, { language: "de", locale: "de-DE", timezone: "UTC" })).toBe(
      "1.234,5",
    );
  });
});

describe("parseLocaleNumberInput", () => {
  it("strips en-US grouping", () => {
    expect(parseLocaleNumberInput("1,234.5", "en-US")).toBe("1234.5");
  });

  it("converts de-DE decimal comma", () => {
    expect(parseLocaleNumberInput("1.234,5", "de-DE")).toBe("1234.5");
  });

  it("keeps a trailing locale decimal while typing", () => {
    expect(parseLocaleNumberInput("12,", "de-DE")).toBe("12.");
  });
});
