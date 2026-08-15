import type { Locale } from "antd/es/locale";
import deDE from "antd/locale/de_DE";
import enGB from "antd/locale/en_GB";
import enUS from "antd/locale/en_US";
import esES from "antd/locale/es_ES";
import frFR from "antd/locale/fr_FR";
import jaJP from "antd/locale/ja_JP";
import koKR from "antd/locale/ko_KR";
import ptBR from "antd/locale/pt_BR";
import zhCN from "antd/locale/zh_CN";
import zhTW from "antd/locale/zh_TW";
import dayjs from "dayjs";
import "dayjs/locale/de";
import "dayjs/locale/en-gb";
import "dayjs/locale/es";
import "dayjs/locale/fr";
import "dayjs/locale/ja";
import "dayjs/locale/ko";
import "dayjs/locale/pt-br";
import "dayjs/locale/zh-cn";
import "dayjs/locale/zh-tw";
import type { DisplayContext } from "./types";
import { normalizeIntlLocale } from "./dateFormat";

const ANTD_LOCALE_BY_BCP47: Record<string, Locale> = {
  "de-DE": deDE,
  "en-GB": enGB,
  "en-US": enUS,
  "es-ES": esES,
  "fr-FR": frFR,
  "ja-JP": jaJP,
  "ko-KR": koKR,
  "pt-BR": ptBR,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
};

const DAYJS_LOCALE_BY_BCP47: Record<string, string> = {
  "de-DE": "de",
  "en-GB": "en-gb",
  "en-US": "en",
  "es-ES": "es",
  "fr-FR": "fr",
  "ja-JP": "ja",
  "ko-KR": "ko",
  "pt-BR": "pt-br",
  "zh-CN": "zh-cn",
  "zh-TW": "zh-tw",
};

const ANTD_LOCALE_BY_LANGUAGE: Record<string, Locale> = {
  de: deDE,
  en: enUS,
  es: esES,
  fr: frFR,
  ja: jaJP,
  ko: koKR,
  pt: ptBR,
  zh: zhCN,
};

const DAYJS_LOCALE_BY_LANGUAGE: Record<string, string> = {
  de: "de",
  en: "en",
  es: "es",
  fr: "fr",
  ja: "ja",
  ko: "ko",
  pt: "pt-br",
  zh: "zh-cn",
};

function resolveBcp47(ctx?: DisplayContext): string {
  return normalizeIntlLocale(ctx?.locale) || "en-US";
}

/** Ant Design component locale (DatePicker month/week labels, pagination, etc.). */
export function antdLocaleForDisplay(ctx?: DisplayContext): Locale {
  const bcp47 = resolveBcp47(ctx);
  if (ANTD_LOCALE_BY_BCP47[bcp47]) {
    return ANTD_LOCALE_BY_BCP47[bcp47];
  }
  const language = bcp47.split("-")[0]?.toLowerCase() ?? "en";
  return ANTD_LOCALE_BY_LANGUAGE[language] ?? enUS;
}

/** Sync dayjs locale with the user's display context for Ant Design DatePicker parsing. */
export function applyDayjsLocale(ctx?: DisplayContext): void {
  const bcp47 = resolveBcp47(ctx);
  const locale =
    DAYJS_LOCALE_BY_BCP47[bcp47] ??
    DAYJS_LOCALE_BY_LANGUAGE[bcp47.split("-")[0]?.toLowerCase() ?? ""] ??
    "en";
  try {
    dayjs.locale(locale);
  } catch {
    dayjs.locale("en");
  }
}
