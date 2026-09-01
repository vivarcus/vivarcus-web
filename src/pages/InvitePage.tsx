import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { Alert, Button, ConfigProvider, Form, Input, Spin } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, HttpError } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { loadLoginLang, saveLoginLang, type LoginLang } from "../auth/rememberedUser";
import { AuthLangSwitcher } from "../components/AuthLangSwitcher";
import { antdLocaleForDisplay } from "../lib/i18n/antdLocale";
import { displayContextForLoginLang, inviteLabelsFromChrome } from "../lib/i18n/preAuthLabels";

type InviteFormValues = {
  password: string;
  confirm: string;
};

export function InvitePage() {
  const { authChrome } = useAuth();
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm<InviteFormValues>();
  const [lang, setLang] = useState<LoginLang>(() => loadLoginLang());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [done, setDone] = useState(false);

  const token =
    searchParams.get("token")?.trim() || searchParams.get("utp")?.trim() || "";
  const labels = useMemo(
    () => inviteLabelsFromChrome(authChrome, lang),
    [lang, authChrome],
  );
  const antdLocale = useMemo(
    () => antdLocaleForDisplay(displayContextForLoginLang(lang)),
    [lang],
  );
  const shownError = invalid ? labels.inviteInvalid : error;

  useEffect(() => {
    saveLoginLang(lang);
  }, [lang]);

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setInvalid(true);
      setError(null);
      setLoading(false);
      return;
    }
    void (async () => {
      setLoading(true);
      try {
        const view = await api.peekInvite(token);
        if (cancelled) return;
        setUsername(view.username);
        setInvalid(false);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof HttpError && err.message !== "invite_invalid") {
          setInvalid(false);
          setError(err.message);
        } else {
          setInvalid(true);
          setError(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onFinish(values: InviteFormValues) {
    setInvalid(false);
    setError(null);
    setSaving(true);
    try {
      await api.completeInvite(token, values.password);
      setDone(true);
    } catch (err) {
      if (err instanceof HttpError && err.message !== "invite_invalid") {
        setError(err.message);
      } else {
        setInvalid(true);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <ConfigProvider locale={antdLocale}>
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
            {shownError ? <Alert type="error" title={shownError} showIcon role="alert" /> : null}
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
      <footer className="auth-footer">
        <div className="auth-footer__links">
          <AuthLangSwitcher lang={lang} onChange={setLang} />
        </div>
      </footer>
    </div>
    </ConfigProvider>
  );
}
