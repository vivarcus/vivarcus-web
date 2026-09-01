import type { LoginLang } from "../../auth/rememberedUser";
import type { AuthChrome } from "./chromeTypes";
import { displayText, displayTextKey } from "./displayText";
import type { DisplayContext, DisplayText } from "./types";

/** Pre-auth Chinese overlay. Login has no vault, so chrome stays English until overlay. */
const AUTH_ZH: Record<string, string> = {
  "auth.login": "登录",
  "auth.logging_in": "正在登录…",
  "auth.login_failed": "登录失败",
  "auth.login_failed_with_code": "登录失败（{code}）",
  "auth.continue": "继续",
  "auth.username": "用户名",
  "auth.password": "密码",
  "auth.login_help": "登录遇到问题？",
  "auth.login_help_modal_title": "登录帮助",
  "auth.login_help_email_label": "电子邮件",
  "auth.login_help_sent": "如果该电子邮件有对应账户，我们已发送登录帮助。",
  "auth.forgot_password": "忘记密码？",
  "auth.forgot_password_sent": "如果该用户名有对应账户，我们已发送密码重置说明。",
  "auth.privacy_policy": "隐私政策",
  "auth.log_in_title": "登录",
  "auth.welcome_title": "欢迎",
  "auth.switch_user": "切换用户",
  "auth.loading_vaults": "正在加载 Vault…",
  "auth.load_vaults_failed": "无法加载 Vault 列表",
  "auth.select_vault": "选择 Vault",
  "auth.select_vault_subtitle": "选择一个 Vault 以继续",
  "auth.load_failed_title": "无法加载",
  "auth.no_vaults": "无可用 Vault",
  "auth.no_vaults_admin": "此账户没有 Vault 分配。请联系管理员。",
  "auth.open_vault": "打开",
  "auth.oauth_denied": "授权被拒绝",
  "auth.oauth_unauthorized": "未授权",
  "auth.oauth_no_linked_user": "未找到关联用户，请联系管理员。",
  "auth.set_password_title": "设置密码",
  "auth.confirm_password": "确认密码",
  "auth.set_password": "设置密码",
  "auth.invite_invalid": "此邀请链接无效或已过期。",
  "auth.invite_password_set": "密码已保存。您可以登录。",
  "auth.go_to_login": "前往登录",
  "auth.password_mismatch": "两次输入的密码不一致",
};

const CHUNK_LABELS: Record<LoginLang, Record<string, string>> = {
  zh: {
    page_updated: "页面已更新",
    reloading: "正在刷新以加载最新版本…",
    chunk_failed: "页面资源加载失败",
    page_failed: "页面加载失败",
    unknown_error: "未知错误",
    reload: "刷新页面",
  },
  en: {
    page_updated: "Page updated",
    reloading: "Refreshing to load the latest version…",
    chunk_failed: "Failed to load page resources",
    page_failed: "Failed to load page",
    unknown_error: "Unknown error",
    reload: "Reload page",
  },
};

export function resolvePreAuthText(
  value: DisplayText | string | null | undefined,
  lang: LoginLang,
  fallback = "",
): string {
  if (lang === "zh") {
    const key = displayTextKey(value)?.replace(/^system:/, "");
    if (key && AUTH_ZH[key]) return AUTH_ZH[key];
  }
  return displayText(value, fallback);
}

export type LoginLabels = {
  login: string;
  continue: string;
  username: string;
  password: string;
  loginHelp: string;
  loginHelpModalTitle: string;
  loginHelpEmail: string;
  loginHelpSent: string;
  forgotPassword: string;
  forgotPasswordSent: string;
  privacyPolicy: string;
  logInTitle: string;
  welcomeTitle: string;
  switchUser: string;
  loginFailed: string;
};

export function loginLabelsFromChrome(chrome: AuthChrome, lang: LoginLang): LoginLabels {
  const t = (value: DisplayText, fallback: string) => resolvePreAuthText(value, lang, fallback);
  return {
    login: t(chrome.login, "Log In"),
    continue: t(chrome.continue, "Continue"),
    username: t(chrome.username, "User Name"),
    password: t(chrome.password, "Password"),
    loginHelp: t(chrome.login_help, "Having trouble logging in?"),
    loginHelpModalTitle: t(chrome.login_help_modal_title, "Login help"),
    loginHelpEmail: t(chrome.login_help_email_label, "Email"),
    loginHelpSent: t(
      chrome.login_help_sent,
      "If an account exists for that email, we sent login help.",
    ),
    forgotPassword: t(chrome.forgot_password, "Forgot password?"),
    forgotPasswordSent: t(
      chrome.forgot_password_sent,
      "If an account exists for that user name, we sent password reset instructions.",
    ),
    privacyPolicy: t(chrome.privacy_policy, "Privacy Policy"),
    logInTitle: t(chrome.log_in_title, "Log in"),
    welcomeTitle: t(chrome.welcome_title, "Welcome"),
    switchUser: t(chrome.switch_user, "Switch user"),
    loginFailed: t(chrome.login_failed, "Log in failed"),
  };
}

export type InviteLabels = {
  setPasswordTitle: string;
  password: string;
  confirmPassword: string;
  setPassword: string;
  inviteInvalid: string;
  invitePasswordSet: string;
  goToLogin: string;
  mismatch: string;
};

export function inviteLabelsFromChrome(chrome: AuthChrome, lang: LoginLang): InviteLabels {
  const t = (value: DisplayText, fallback: string) => resolvePreAuthText(value, lang, fallback);
  return {
    setPasswordTitle: t(chrome.set_password_title, "Set your password"),
    password: t(chrome.password, "Password"),
    confirmPassword: t(chrome.confirm_password, "Confirm password"),
    setPassword: t(chrome.set_password, "Set password"),
    inviteInvalid: t(
      chrome.invite_invalid,
      "This invitation link is invalid or has expired.",
    ),
    invitePasswordSet: t(chrome.invite_password_set, "Password saved. You can sign in."),
    goToLogin: t(chrome.go_to_login, "Go to sign in"),
    mismatch: t(chrome.password_mismatch, "Passwords do not match"),
  };
}

export function chunkLoadLabels(lang: LoginLang) {
  return CHUNK_LABELS[lang] ?? CHUNK_LABELS.en;
}

export function vaultSelectLabelsFromChrome(chrome: AuthChrome, lang: LoginLang) {
  const t = (value: DisplayText, fallback: string) => resolvePreAuthText(value, lang, fallback);
  return {
    selectVault: t(chrome.select_vault, "Select a Vault"),
    selectVaultSubtitle: t(chrome.select_vault_subtitle, "Choose a Vault to continue"),
    noVaults: t(chrome.no_vaults, "No Vaults available"),
    noVaultsAdmin: t(
      chrome.no_vaults_admin,
      "This account has no Vault assignments. Contact your administrator.",
    ),
  };
}

export function oauthErrorFromChrome(
  code: string | null,
  chrome: AuthChrome,
  lang: LoginLang,
): string {
  const t = (value: DisplayText, fallback: string) => resolvePreAuthText(value, lang, fallback);
  if (code === "no_linked_user") {
    return t(chrome.oauth_no_linked_user, "No linked user found. Contact your administrator.");
  }
  if (code === "oauth_denied") {
    return t(chrome.oauth_denied, "Authorization was denied");
  }
  if (code === "unauthorized") {
    return t(chrome.oauth_unauthorized, "Unauthorized");
  }
  if (code) {
    return t(chrome.login_failed_with_code, "Log in failed ({code})").replaceAll("{code}", code);
  }
  return t(chrome.login_failed, "Log in failed");
}

export function displayContextForLoginLang(lang: LoginLang): DisplayContext {
  if (lang === "zh") {
    return { language: "zh", locale: "zh-CN", timezone: "UTC" };
  }
  return { language: "en", locale: "en-US", timezone: "UTC" };
}
