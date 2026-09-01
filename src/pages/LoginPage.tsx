import { DownOutlined, LockOutlined, UserOutlined } from "@ant-design/icons";
import { Alert, Button, Dropdown, Form, Input, Modal } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { api, HttpError } from "../api/client";
import type { LoginProviderLink } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import {
  clearRememberedUser,
  loadLoginLang,
  loadRememberedUser,
  saveLoginLang,
  type LoginLang,
} from "../auth/rememberedUser";
import {
  markPendingDefaultLanding,
  resolveDefaultLandingRoute,
} from "../lib/defaultLanding";
import { displayText, type AuthChrome } from "../lib/i18n";
import { redirectToVaultHostIfConfigured } from "../lib/vaultHostNav";
import { loadSession } from "../auth/session";

type LoginFormValues = {
  username: string;
  password?: string;
};

type LoginLabels = {
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

const ZH_LABELS: LoginLabels = {
  login: "登录",
  continue: "继续",
  username: "用户名",
  password: "密码",
  loginHelp: "登录遇到问题？",
  loginHelpModalTitle: "登录帮助",
  loginHelpEmail: "电子邮件",
  loginHelpSent: "如果该电子邮件有对应账户，我们已发送登录帮助。",
  forgotPassword: "忘记密码？",
  forgotPasswordSent: "如果该用户名有对应账户，我们已发送密码重置说明。",
  privacyPolicy: "隐私政策",
  logInTitle: "登录",
  welcomeTitle: "欢迎",
  switchUser: "切换用户",
  loginFailed: "登录失败",
};

function labelsFromChrome(chrome: AuthChrome): LoginLabels {
  return {
    login: displayText(chrome.login, "Log In"),
    continue: displayText(chrome.continue, "Continue"),
    username: displayText(chrome.username, "User Name"),
    password: displayText(chrome.password, "Password"),
    loginHelp: displayText(chrome.login_help, "Having trouble logging in?"),
    loginHelpModalTitle: displayText(chrome.login_help_modal_title, "Login help"),
    loginHelpEmail: displayText(chrome.login_help_email_label, "Email"),
    loginHelpSent: displayText(
      chrome.login_help_sent,
      "If an account exists for that email, we sent login help.",
    ),
    forgotPassword: displayText(chrome.forgot_password, "Forgot password?"),
    forgotPasswordSent: displayText(
      chrome.forgot_password_sent,
      "If an account exists for that user name, we sent password reset instructions.",
    ),
    privacyPolicy: displayText(chrome.privacy_policy, "Privacy Policy"),
    logInTitle: displayText(chrome.log_in_title, "Log in"),
    welcomeTitle: displayText(chrome.welcome_title, "Welcome"),
    switchUser: displayText(chrome.switch_user, "Switch user"),
    loginFailed: displayText(chrome.login_failed, "Log in failed"),
  };
}

type LoginStep = "username" | "password" | "sso";

function applyResolveResult(
  username: string,
  res: {
    auth_mode: "password" | "sso";
    authorize_url?: string;
    providers?: LoginProviderLink[];
    allow_browser_password_save?: boolean;
  },
  setters: {
    setResolvedUsername: (v: string) => void;
    setProviders: (v: LoginProviderLink[]) => void;
    setAllowBrowserPasswordSave: (v: boolean) => void;
    setAuthorizeUrl: (v: string | null) => void;
    setStep: (v: LoginStep) => void;
    setFieldsValue: (v: LoginFormValues) => void;
  },
) {
  setters.setResolvedUsername(username);
  setters.setFieldsValue({ username });
  setters.setProviders(res.providers ?? []);
  setters.setAllowBrowserPasswordSave(res.allow_browser_password_save !== false);
  if (res.auth_mode === "sso" && res.authorize_url) {
    setters.setAuthorizeUrl(res.authorize_url);
    setters.setStep("sso");
    return;
  }
  setters.setAuthorizeUrl(null);
  setters.setStep("password");
}

export function LoginPage() {
  const { session, login, authChrome } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm<LoginFormValues>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<LoginStep>("username");
  const [providers, setProviders] = useState<LoginProviderLink[]>([]);
  const [resolvedUsername, setResolvedUsername] = useState("");
  const [authorizeUrl, setAuthorizeUrl] = useState<string | null>(null);
  const [allowBrowserPasswordSave, setAllowBrowserPasswordSave] = useState(true);
  const [lang, setLang] = useState<LoginLang>(() => loadLoginLang());
  const [rememberBootstrapping, setRememberBootstrapping] = useState(
    () => !!loadRememberedUser()?.userName,
  );
  // Hold Navigate-to-/ while post-login landing is resolving (avoids Tasks flash → /vault-ai).
  const [completingLogin, setCompletingLogin] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpForgot, setHelpForgot] = useState(false);
  const [helpEmail, setHelpEmail] = useState("");
  const [helpUsername, setHelpUsername] = useState("");
  const [helpBusy, setHelpBusy] = useState(false);
  const [helpMessage, setHelpMessage] = useState<string | null>(null);

  const labels = useMemo(
    () => (lang === "zh" ? ZH_LABELS : labelsFromChrome(authChrome)),
    [lang, authChrome],
  );

  useEffect(() => {
    saveLoginLang(lang);
  }, [lang]);

  useEffect(() => {
    const prefill =
      searchParams.get("prefill")?.trim() || searchParams.get("username")?.trim() || "";
    if (prefill) {
      form.setFieldsValue({ username: prefill });
      setHelpUsername(prefill);
    }
    if (searchParams.get("help") === "1") {
      setHelpForgot(false);
      setHelpOpen(true);
    }
    if (searchParams.get("forgot") === "1") {
      setHelpForgot(true);
      setHelpOpen(true);
    }
  }, [form, searchParams]);

  useEffect(() => {
    const remembered = loadRememberedUser();
    if (!remembered?.userName) {
      setRememberBootstrapping(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setResolvedUsername(remembered.userName);
      form.setFieldsValue({ username: remembered.userName });
      setLoading(true);
      try {
        const res = await api.resolveLogin(remembered.userName);
        if (cancelled) return;
        applyResolveResult(remembered.userName, res, {
          setResolvedUsername,
          setProviders,
          setAllowBrowserPasswordSave,
          setAuthorizeUrl,
          setStep,
          setFieldsValue: (v) => form.setFieldsValue(v),
        });
      } catch {
        if (cancelled) return;
        clearRememberedUser();
        setStep("username");
        setResolvedUsername("");
        setAuthorizeUrl(null);
        form.setFieldsValue({ username: "", password: undefined });
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRememberBootstrapping(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [form]);

  if (session && !completingLogin) {
    return <Navigate to="/" replace />;
  }

  async function submitLoginHelp() {
    if (helpMessage) {
      setHelpOpen(false);
      setHelpMessage(null);
      return;
    }
    setHelpBusy(true);
    try {
      if (helpForgot) {
        const username = helpUsername.trim();
        if (!username) {
          return;
        }
        await api.requestPasswordReset(username);
        setHelpMessage(labels.forgotPasswordSent);
      } else {
        const email = helpEmail.trim();
        if (!email) {
          return;
        }
        await api.requestLoginHelp(email);
        setHelpMessage(labels.loginHelpSent);
      }
    } catch {
      setHelpMessage(helpForgot ? labels.forgotPasswordSent : labels.loginHelpSent);
    } finally {
      setHelpBusy(false);
    }
  }

  async function onContinue(values: LoginFormValues) {
    setError(null);
    setLoading(true);
    const username = values.username.trim();
    try {
      const res = await api.resolveLogin(username);
      applyResolveResult(username, res, {
        setResolvedUsername,
        setProviders,
        setAllowBrowserPasswordSave,
        setAuthorizeUrl,
        setStep,
        setFieldsValue: (v) => form.setFieldsValue(v),
      });
    } catch (err) {
      if (err instanceof HttpError) {
        setError(err.message);
      } else {
        setError(labels.loginFailed);
      }
    } finally {
      setLoading(false);
    }
  }

  async function onLogin(values: LoginFormValues) {
    setError(null);
    setLoading(true);
    setCompletingLogin(true);
    const username = (values.username?.trim() || resolvedUsername).trim();
    try {
      const vaultId = await login(username, values.password ?? "");
      const landing = await resolveDefaultLandingRoute(vaultId);
      const sess = loadSession();
      if (
        sess &&
        (await redirectToVaultHostIfConfigured(vaultId, sess.vaults, landing))
      ) {
        return;
      }
      // Fallback hold only when we could not resolve AI landing before entering shell.
      if (landing === "/") {
        markPendingDefaultLanding();
      }
      navigate(landing, { replace: true });
      // Keep completingLogin true so session cannot trip Navigate to "/" before leave.
    } catch (err) {
      setCompletingLogin(false);
      if (err instanceof HttpError) {
        setError(err.message);
      } else {
        setError(labels.loginFailed);
      }
    } finally {
      setLoading(false);
    }
  }

  function onSsoLogin() {
    if (!authorizeUrl) {
      setError(labels.loginFailed);
      return;
    }
    setError(null);
    setLoading(true);
    window.location.href = authorizeUrl;
  }

  function onSwitchUser() {
    clearRememberedUser();
    setError(null);
    setProviders([]);
    setResolvedUsername("");
    setAuthorizeUrl(null);
    setStep("username");
    form.setFieldsValue({ username: "", password: undefined });
  }

  function onFormFinish(values: LoginFormValues) {
    if (step === "username") {
      void onContinue(values);
      return;
    }
    if (step === "sso") {
      onSsoLogin();
      return;
    }
    void onLogin(values);
  }

  const langMenuItems = [
    {
      key: "en",
      label: "English",
      onClick: () => setLang("en"),
    },
    {
      key: "zh",
      label: "中文",
      onClick: () => setLang("zh"),
    },
  ];

  const showUserStep =
    step === "password" ||
    step === "sso" ||
    (rememberBootstrapping && resolvedUsername !== "");
  const ssoPrimaryLabel = providers[0]?.label || providers[0]?.name || labels.login;

  return (
    <div className="auth-page">
      <Form
        form={form}
        className="auth-card auth-card--antd"
        layout="vertical"
        requiredMark={false}
        onFinish={onFormFinish}
      >
        <h1 className="visually-hidden">Vivarcus</h1>
        <div className="auth-card__logo" aria-hidden="true">
          <span className="auth-card__logo-dark">Vivar</span>
          <span className="auth-card__logo-accent">cus</span>
        </div>
        <p className="auth-card__title" aria-hidden="true">
          {showUserStep ? labels.welcomeTitle : labels.logInTitle}
        </p>
        {!showUserStep ? (
          <Form.Item
            name="username"
            rules={[{ required: true, message: labels.username }]}
          >
            <Input
              size="large"
              prefix={<UserOutlined aria-hidden="true" />}
              autoComplete="username"
              aria-label={labels.username}
              placeholder={labels.username}
              disabled={rememberBootstrapping}
            />
          </Form.Item>
        ) : (
          <>
            <Form.Item name="username" hidden>
              <Input />
            </Form.Item>
            <div className="auth-card__user-display" aria-label={labels.username}>
              <UserOutlined aria-hidden="true" className="auth-card__user-avatar" />
              <span className="auth-card__user-name" title={resolvedUsername}>
                {resolvedUsername}
              </span>
            </div>
          </>
        )}
        {step === "password" ? (
          <Form.Item
            name="password"
            rules={[{ required: true, message: labels.password }]}
          >
            <Input.Password
              size="large"
              prefix={<LockOutlined aria-hidden="true" />}
              autoComplete={allowBrowserPasswordSave ? "current-password" : "off"}
              aria-label={labels.password}
              placeholder={labels.password}
              disabled={rememberBootstrapping}
            />
          </Form.Item>
        ) : null}
        {error && (
          <Alert type="error" title={error} showIcon role="alert" />
        )}
        <Button
          type="primary"
          htmlType="submit"
          size="large"
          block
          className="auth-card__submit"
          loading={loading || rememberBootstrapping}
        >
          {step === "username"
            ? labels.continue
            : step === "sso"
              ? ssoPrimaryLabel
              : labels.login}
        </Button>
        <div
          className={
            showUserStep
              ? "auth-card__links auth-card__links--split"
              : "auth-card__links"
          }
        >
          <a
            href="#help"
            className="auth-card__link"
            onClick={(e) => {
              e.preventDefault();
              setHelpMessage(null);
              setHelpForgot(false);
              setHelpOpen(true);
            }}
          >
            {labels.loginHelp}
          </a>
          {showUserStep ? (
            <a
              href="#switch-user"
              className="auth-card__link"
              onClick={(e) => {
                e.preventDefault();
                onSwitchUser();
              }}
            >
              {labels.switchUser}
            </a>
          ) : null}
        </div>
      </Form>
      <footer className="auth-footer">
        <div className="auth-footer__links">
          <a href="#privacy" onClick={(e) => e.preventDefault()}>
            {labels.privacyPolicy}
          </a>
          <span className="auth-footer__sep" aria-hidden="true">
            |
          </span>
          <Dropdown menu={{ items: langMenuItems, selectable: true, selectedKeys: [lang] }}>
            <button type="button" className="auth-footer__lang">
              {lang === "zh" ? "中文" : "English"}
              <DownOutlined aria-hidden="true" />
            </button>
          </Dropdown>
        </div>
        <p className="auth-footer__copy">Copyright 2010–2026 Vivarcus</p>
      </footer>
      <Modal
        title={helpForgot ? labels.forgotPassword : labels.loginHelpModalTitle}
        open={helpOpen}
        onCancel={() => {
          setHelpOpen(false);
          setHelpMessage(null);
        }}
        onOk={() => void submitLoginHelp()}
        confirmLoading={helpBusy}
        okText={labels.continue}
        destroyOnHidden
      >
        {helpMessage ? (
          <Alert type="success" title={helpMessage} showIcon />
        ) : helpForgot ? (
          <Input
            autoComplete="username"
            aria-label={labels.username}
            placeholder={labels.username}
            value={helpUsername}
            onChange={(e) => setHelpUsername(e.target.value)}
            onPressEnter={() => void submitLoginHelp()}
          />
        ) : (
          <Input
            autoComplete="email"
            type="email"
            aria-label={labels.loginHelpEmail}
            placeholder={labels.loginHelpEmail}
            value={helpEmail}
            onChange={(e) => setHelpEmail(e.target.value)}
            onPressEnter={() => void submitLoginHelp()}
          />
        )}
        {!helpMessage && !helpForgot ? (
          <p className="auth-card__links" style={{ marginTop: 12 }}>
            <a
              href="#forgot"
              className="auth-card__link"
              onClick={(e) => {
                e.preventDefault();
                setHelpForgot(true);
                setHelpMessage(null);
              }}
            >
              {labels.forgotPassword}
            </a>
          </p>
        ) : null}
      </Modal>
    </div>
  );
}
