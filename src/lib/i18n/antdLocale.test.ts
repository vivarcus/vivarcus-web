import { describe, expect, it } from "vitest";
import zhCN from "antd/locale/zh_CN";
import enUS from "antd/locale/en_US";
import dayjs from "dayjs";
import { antdLocaleForDisplay, applyDayjsLocale } from "./antdLocale";
import type { DisplayContext } from "./types";

const zhContext: DisplayContext = {
  language: "zh",
  locale: "zh_CN",
  timezone: "Asia/Shanghai",
  date_format_profile: "numeric",
};

describe("antdLocaleForDisplay", () => {
  it("maps Vault locale keys to antd locale packs", () => {
    expect(antdLocaleForDisplay(zhContext).locale).toBe(zhCN.locale);
    expect(antdLocaleForDisplay({ ...zhContext, locale: "en_us" }).locale).toBe(enUS.locale);
  });

  it("falls back to language prefix", () => {
    expect(antdLocaleForDisplay({ ...zhContext, locale: "zh_SG" }).locale).toBe(zhCN.locale);
  });
});

describe("applyDayjsLocale", () => {
  it("sets dayjs locale from display context", () => {
    applyDayjsLocale(zhContext);
    expect(dayjs.locale()).toBe("zh-cn");
    applyDayjsLocale({ ...zhContext, locale: "en-US" });
    expect(dayjs.locale()).toBe("en");
  });
});
