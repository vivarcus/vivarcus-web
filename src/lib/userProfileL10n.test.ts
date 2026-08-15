import { describe, expect, it } from "vitest";
import {
  isLocaleAllowedForLanguage,
  languageCodeFromPicklistEntry,
  localeOptionsForLanguage,
} from "./userProfileL10n";

describe("userProfileL10n", () => {
  const localesByLanguage = {
    en: [
      { name: "en_us__sys", label: "English (United States) (en-US)" },
      { name: "en_gb__sys", label: "English (United Kingdom) (en-GB)" },
    ],
    zh: [{ name: "zh_cn__sys", label: "Chinese (China) (zh-CN)" }],
  };

  it("maps picklist entry to language code", () => {
    expect(languageCodeFromPicklistEntry("en__sys")).toBe("en");
    expect(languageCodeFromPicklistEntry("zh")).toBe("zh");
  });

  it("filters locale options by language", () => {
    expect(localeOptionsForLanguage(localesByLanguage, "zh__sys", []).length).toBe(1);
    expect(localeOptionsForLanguage(localesByLanguage, "en__sys", []).length).toBe(2);
  });

  it("validates locale against language", () => {
    expect(isLocaleAllowedForLanguage(localesByLanguage, "en__sys", "en_us__sys")).toBe(true);
    expect(isLocaleAllowedForLanguage(localesByLanguage, "en__sys", "zh_cn__sys")).toBe(false);
  });
});
