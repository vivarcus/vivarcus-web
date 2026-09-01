import type { LoginLang } from "../../auth/rememberedUser";

/** Public help home for the user's display or login language. */
export function helpSiteHomeUrl(language: string | undefined, loginLang: LoginLang): string {
  const raw = (language || loginLang).toLowerCase();
  const lang = raw.startsWith("en") ? "en" : "zh";
  return `https://vivarcus.com/help/${lang}/`;
}
