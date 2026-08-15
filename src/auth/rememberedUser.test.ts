import { afterEach, describe, expect, it } from "vitest";
import {
  LOGIN_LANG_KEY,
  REMEMBERED_USER_COOKIE,
  clearRememberedUser,
  loadLoginLang,
  loadRememberedUser,
  saveLoginLang,
  saveRememberedUser,
} from "./rememberedUser";

function clearAllCookies() {
  for (const part of document.cookie.split(";")) {
    const name = part.split("=")[0]?.trim();
    if (name) {
      document.cookie = `${name}=; Path=/; Max-Age=0`;
    }
  }
}

describe("rememberedUser", () => {
  afterEach(() => {
    clearAllCookies();
    localStorage.removeItem(LOGIN_LANG_KEY);
  });

  it("saves and loads remembered username from cookie", () => {
    saveRememberedUser("alice@domain.test");
    expect(document.cookie).toContain(REMEMBERED_USER_COOKIE);
    expect(loadRememberedUser()).toEqual({ userName: "alice@domain.test" });
  });

  it("clears remembered user", () => {
    saveRememberedUser("alice@domain.test");
    clearRememberedUser();
    expect(loadRememberedUser()).toBeNull();
  });

  it("ignores malformed cookie payloads", () => {
    document.cookie = `${REMEMBERED_USER_COOKIE}=%7Bnot-json; Path=/`;
    expect(loadRememberedUser()).toBeNull();
  });

  it("persists login language preference", () => {
    expect(loadLoginLang()).toBe("en");
    saveLoginLang("zh");
    expect(loadLoginLang()).toBe("zh");
    expect(document.documentElement.lang).toBe("zh-CN");
  });
});
