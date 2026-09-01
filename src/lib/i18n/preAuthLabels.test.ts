import { describe, expect, it } from "vitest";
import { defaultAuthChrome } from "./chromeTypes";
import {
  chunkLoadLabels,
  inviteLabelsFromChrome,
  loginLabelsFromChrome,
  oauthErrorFromChrome,
  vaultSelectLabelsFromChrome,
} from "./preAuthLabels";

describe("preAuthLabels", () => {
  it("resolves Chinese login copy from the overlay", () => {
    const labels = loginLabelsFromChrome(defaultAuthChrome, "zh");
    expect(labels.username).toBe("用户名");
    expect(labels.login).toBe("登录");
    expect(labels.continue).toBe("继续");
    expect(labels.forgotPassword).toBe("忘记密码？");
  });

  it("keeps English login copy from chrome", () => {
    const labels = loginLabelsFromChrome(defaultAuthChrome, "en");
    expect(labels.username).toBe("User Name");
    expect(labels.login).toBe("Log In");
    expect(labels.continue).toBe("Continue");
  });

  it("resolves Chinese invite mismatch from chrome overlay", () => {
    const labels = inviteLabelsFromChrome(defaultAuthChrome, "zh");
    expect(labels.mismatch).toBe("两次输入的密码不一致");
    expect(labels.setPasswordTitle).toBe("设置密码");
    expect(labels.goToLogin).toBe("前往登录");
  });

  it("keeps English invite mismatch from chrome", () => {
    const labels = inviteLabelsFromChrome(defaultAuthChrome, "en");
    expect(labels.mismatch).toBe("Passwords do not match");
  });

  it("exposes chunk recovery copy in both languages", () => {
    expect(chunkLoadLabels("zh").reload).toBe("刷新页面");
    expect(chunkLoadLabels("en").reload).toBe("Reload page");
    expect(chunkLoadLabels("en").page_failed).toBe("Failed to load page");
  });

  it("resolves Chinese vault picker copy from the overlay", () => {
    const labels = vaultSelectLabelsFromChrome(defaultAuthChrome, "zh");
    expect(labels.selectVault).toBe("选择 Vault");
    expect(labels.noVaults).toBe("无可用 Vault");
  });

  it("keeps English vault picker copy from chrome", () => {
    const labels = vaultSelectLabelsFromChrome(defaultAuthChrome, "en");
    expect(labels.selectVault).toBe("Select a Vault");
    expect(labels.noVaults).toBe("No Vaults available");
  });

  it("resolves OAuth errors in both languages", () => {
    expect(oauthErrorFromChrome("oauth_denied", defaultAuthChrome, "zh")).toBe("授权被拒绝");
    expect(oauthErrorFromChrome("oauth_denied", defaultAuthChrome, "en")).toBe(
      "Authorization was denied",
    );
    expect(oauthErrorFromChrome("bad", defaultAuthChrome, "zh")).toBe("登录失败（bad）");
    expect(oauthErrorFromChrome("bad", defaultAuthChrome, "en")).toBe("Log in failed (bad)");
  });
});
