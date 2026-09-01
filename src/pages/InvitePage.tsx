import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { Alert, Button, Form, Input, Spin } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, HttpError } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { loadLoginLang, type LoginLang } from "../auth/rememberedUser";
import { displayText, type AuthChrome } from "../lib/i18n";

type InviteFormValues = {
  password: string;
  confirm: string;
};

type InviteLabels = {
  setPasswordTitle: string;
  password: string;
  confirmPassword: string;
  setPassword: string;
  inviteInvalid: string;
  invitePasswordSet: string;
  goToLogin: string;
  mismatch: string;
};

const ZH_LABELS: InviteLabels = {
  setPasswordTitle: "设置密码",
  password: "密码",
  confirmPassword: "确认密码",
  setPassword: "设置密码",
  inviteInvalid: "邀请链接无效或已过期。",
  invitePasswordSet: "密码已保存，可以登录。",
  goToLogin: "去登录",
  mismatch: "两次输入的密码不一致",
};

function labelsFromChrome(chrome: AuthChrome): InviteLabels {
  return {
    setPasswordTitle: displayText(chrome.set_password_title, "Set your password"),
    password: displayText(chrome.password, "Password"),
    confirmPassword: displayText(chrome.confirm_password, "Confirm password"),
    setPassword: displayText(chrome.set_password, "Set password"),
    inviteInvalid: displayText(
      chrome.invite_invalid,
      "This invitation link is invalid or has expired.",
    ),
    invitePasswordSet: displayText(
      chrome.invite_password_set,
      "Password saved. You can sign in.",
    ),
    goToLogin: displayText(chrome.go_to_login, "Go to sign in"),
    mismatch: "Passwords do not match",
  };
}

export function InvitePage() {
  const { authChrome } = useAuth();
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm<InviteFormValues>();
  const [lang] = useState<LoginLang>(() => loadLoginLang());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [done, setDone] = useState(false);

  const token =
    searchParams.get("token")?.trim() || searchParams.get("utp")?.trim() || "";
  const labels = useMemo(
    () => (lang === "zh" ? ZH_LABELS : labelsFromChrome(authChrome)),
    [lang, authChrome],
  );

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setError(labels.inviteInvalid);
      setLoading(false);
      return;
    }
    void (async () => {
      setLoading(true);
      try {
        const view = await api.peekInvite(token);
        if (cancelled) return;
        setUsername(view.username);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof HttpError) {
          setError(err.message === "invite_invalid" ? labels.inviteInvalid : err.message);
        } else {
          setError(labels.inviteInvalid);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, labels.inviteInvalid]);

  async function onFinish(values: InviteFormValues) {
    setError(null);
    setSaving(true);
    try {
      await api.completeInvite(token, values.password);
      setDone(true);
    } catch (err) {
      if (err instanceof HttpError) {
        setError(err.message === "invite_invalid" ? labels.inviteInvalid : err.message);
      } else {
        setError(labels.inviteInvalid);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card auth-card--antd">
        <h1 className="visually-hidden">Vivarcus</h1>
        <div className="auth-card__logo" aria-hidden="true">
          <span className="auth-card__logo-dark">Vivar</span>
          <span className="auth-card__logo-accent">cus</span>
        </div>
        <p className="auth-card__title">{labels.setPasswordTitle}</p>
        {loading ? (
          <Spin />
        ) : (
          <>
            {username ? (
              <div className="auth-card__user-display" aria-label={username}>
                <UserOutlined aria-hidden="true" className="auth-card__user-avatar" />
                <span className="auth-card__user-name" title={username}>
                  {username}
                </span>
              </div>
            ) : null}
            {error ? <Alert type="error" title={error} showIcon role="alert" /> : null}
            {done ? (
              <Alert type="success" title={labels.invitePasswordSet} showIcon />
            ) : null}
            {username && !done ? (
              <Form
                form={form}
                layout="vertical"
                requiredMark={false}
                onFinish={onFinish}
              >
                <Form.Item
                  name="password"
                  rules={[{ required: true, message: labels.password }]}
                >
                  <Input.Password
                    size="large"
                    prefix={<LockOutlined aria-hidden="true" />}
                    autoComplete="new-password"
                    aria-label={labels.password}
                    placeholder={labels.password}
                  />
                </Form.Item>
                <Form.Item
                  name="confirm"
                  dependencies={["password"]}
                  rules={[
                    { required: true, message: labels.confirmPassword },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue("password") === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error(labels.mismatch));
                      },
                    }),
                  ]}
                >
                  <Input.Password
                    size="large"
                    prefix={<LockOutlined aria-hidden="true" />}
                    autoComplete="new-password"
                    aria-label={labels.confirmPassword}
                    placeholder={labels.confirmPassword}
                  />
                </Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  block
                  className="auth-card__submit"
                  loading={saving}
                >
                  {labels.setPassword}
                </Button>
              </Form>
            ) : (
              <Link to="/login" className="auth-card__link">
                {labels.goToLogin}
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}
