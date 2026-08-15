/** Long-lived cookie remembering the last successful login username (Veeva-style). */

export const REMEMBERED_USER_COOKIE = "vivarcus.userProfile";
export const LOGIN_LANG_KEY = "vivarcus.selectedLang";

const MAX_AGE_SECONDS = 400 * 24 * 60 * 60; // ~13 months, matches Veeva's long-lived cookie

export type RememberedUser = {
  userName: string;
  userProfileUrl?: string;
};

export type LoginLang = "en" | "zh";

function parseCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1")}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, maxAge: number) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Strict${secure}`;
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${encodeURIComponent(name)}=; Path=/; Max-Age=0; SameSite=Strict${secure}`;
}

export function loadRememberedUser(): RememberedUser | null {
  const raw = parseCookie(REMEMBERED_USER_COOKIE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as RememberedUser;
    const userName = typeof parsed.userName === "string" ? parsed.userName.trim() : "";
    if (!userName) return null;
    return {
      userName,
      userProfileUrl:
        typeof parsed.userProfileUrl === "string" ? parsed.userProfileUrl : undefined,
    };
  } catch {
    return null;
  }
}

export function saveRememberedUser(userName: string, userProfileUrl?: string) {
  const trimmed = userName.trim();
  if (!trimmed) return;
  const payload: RememberedUser = { userName: trimmed };
  if (userProfileUrl?.trim()) {
    payload.userProfileUrl = userProfileUrl.trim();
  }
  writeCookie(REMEMBERED_USER_COOKIE, JSON.stringify(payload), MAX_AGE_SECONDS);
}

export function clearRememberedUser() {
  deleteCookie(REMEMBERED_USER_COOKIE);
}

export function loadLoginLang(): LoginLang {
  if (typeof localStorage === "undefined") return "zh";
  const raw = localStorage.getItem(LOGIN_LANG_KEY);
  if (raw === "en") return "en";
  if (raw === "zh") return "zh";
  // Default Chinese; English remains available via the login language switcher.
  return "zh";
}

export function saveLoginLang(lang: LoginLang) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(LOGIN_LANG_KEY, lang);
  if (typeof document !== "undefined") {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  }
}
