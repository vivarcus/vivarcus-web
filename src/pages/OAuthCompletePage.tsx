import { Alert, Spin } from "antd";
import { useEffect, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { HttpError } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import {
  markPendingDefaultLanding,
  resolveDefaultLandingRoute,
} from "../lib/defaultLanding";
import { displayText, displayTextTemplate, type AuthChrome } from "../lib/i18n";
import { redirectToVaultHostIfConfigured } from "../lib/vaultHostNav";
import { loadSession } from "../auth/session";

function oauthErrorMessage(code: string | null, chrome: AuthChrome): string {
  if (code === "no_linked_user") {
    return displayText(chrome.oauth_no_linked_user);
  }
  if (code === "oauth_denied") {
    return displayText(chrome.oauth_denied);
  }
  if (code === "unauthorized") {
    return displayText(chrome.oauth_unauthorized);
  }
  if (code) {
    return displayTextTemplate(chrome.login_failed_with_code, { code });
  }
  return displayText(chrome.login_failed);
}

export function OAuthCompletePage() {
  const { session, completeOAuthSession, authChrome } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  const sessionToken = searchParams.get("session_token");
  const errorCode = searchParams.get("error");

  useEffect(() => {
    if (errorCode) {
      setError(oauthErrorMessage(errorCode, authChrome));
      setBusy(false);
      return;
    }
    if (!sessionToken) {
      setError(oauthErrorMessage(null, authChrome));
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
          setError(oauthErrorMessage(null, authChrome));
        }
        setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionToken, errorCode, completeOAuthSession, navigate, authChrome]);

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
