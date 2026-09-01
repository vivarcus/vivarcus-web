import { Alert, Spin } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { HttpError } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { loadLoginLang } from "../auth/rememberedUser";
import {
  markPendingDefaultLanding,
  resolveDefaultLandingRoute,
} from "../lib/defaultLanding";
import { oauthErrorFromChrome } from "../lib/i18n/preAuthLabels";
import { redirectToVaultHostIfConfigured } from "../lib/vaultHostNav";
import { loadSession } from "../auth/session";

export function OAuthCompletePage() {
  const { session, completeOAuthSession, authChrome } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const lang = useMemo(() => loadLoginLang(), []);

  const sessionToken = searchParams.get("session_token");
  const errorCode = searchParams.get("error");

  useEffect(() => {
    if (errorCode) {
      setError(oauthErrorFromChrome(errorCode, authChrome, lang));
      setBusy(false);
      return;
    }
    if (!sessionToken) {
      setError(oauthErrorFromChrome(null, authChrome, lang));
      setBusy(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const vaultId = await completeOAuthSession(sessionToken);
        if (!cancelled) {
          const landing = await resolveDefaultLandingRoute(vaultId);
          const sess = loadSession();
          if (
            sess &&
            (await redirectToVaultHostIfConfigured(vaultId, sess.vaults, landing))
          ) {
            return;
          }
          if (landing === "/") {
            markPendingDefaultLanding();
          }
          navigate(landing, { replace: true });
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof HttpError) {
          setError(err.message);
        } else {
          setError(oauthErrorFromChrome(null, authChrome, lang));
        }
        setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionToken, errorCode, completeOAuthSession, navigate, authChrome, lang]);

  if (session && !error && !busy) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="auth-page">
      <div className="auth-card auth-card--antd">
        <h1 className="visually-hidden">Vivarcus</h1>
        <div className="auth-card__logo" aria-hidden="true">
          <span className="auth-card__logo-dark">Vivar</span>
          <span className="auth-card__logo-accent">cus</span>
        </div>
        {busy && !error ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <Spin />
          </div>
        ) : null}
        {error ? <Alert type="error" title={error} showIcon role="alert" /> : null}
      </div>
    </div>
  );
}
