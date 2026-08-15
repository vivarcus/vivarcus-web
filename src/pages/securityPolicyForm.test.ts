import { describe, expect, it } from "vitest";
import {
  LOCKOUT_UNLOCK_OPTIONS,
  PASSWORD_EXPIRY_OPTIONS,
  PASSWORD_HISTORY_OPTIONS,
  PASSWORD_RESET_LIMIT_OPTIONS,
  SESSION_IDLE_OPTIONS,
  emptySecurityPolicy,
  formatAuthenticationType,
  formatPasswordExpiry,
  formatPasswordHistory,
  formatPasswordResetLimit,
  formatPolicyStatus,
  nearestSelectValue,
} from "./securityPolicyForm";

describe("securityPolicyForm", () => {
  it("defaults match Veeva Phase 2 password policy", () => {
    const p = emptySecurityPolicy();
    expect(p.password_min_length).toBe(8);
    expect(p.password_history_count).toBe(5);
    expect(p.password_reset_daily_limit).toBe(0);
    expect(p.allow_browser_password_save).toBe(true);
    expect(p.session_idle_timeout_minutes).toBe(0);
    expect(p.authentication_type).toBe("password");
  });

  it("exposes domain-default idle and permanent lockout options", () => {
    expect(SESSION_IDLE_OPTIONS[0]).toEqual({
      value: 0,
      label: "Domain Default Duration",
    });
    expect(LOCKOUT_UNLOCK_OPTIONS[0]).toEqual({ value: 0, label: "Permanent" });
  });

  it("formats list and detail labels like Veeva", () => {
    expect(formatAuthenticationType("password")).toBe("Password");
    expect(formatAuthenticationType("sso")).toBe("SSO");
    expect(formatPolicyStatus("active")).toBe("Active");
    expect(formatPasswordExpiry(90)).toBe("Expires in 90 days");
    expect(formatPasswordExpiry(0)).toBe("Never");
    expect(formatPasswordHistory(5)).toBe("Prevent the reuse of the last 5 passwords");
    expect(formatPasswordResetLimit(0)).toBe("Unlimited");
  });

  it("maps unknown select values to the nearest supported option", () => {
    expect(nearestSelectValue(PASSWORD_EXPIRY_OPTIONS, 90)).toBe(90);
    expect(nearestSelectValue(PASSWORD_EXPIRY_OPTIONS, 45)).toBe(0);
    expect(PASSWORD_HISTORY_OPTIONS).toHaveLength(21);
    expect(PASSWORD_RESET_LIMIT_OPTIONS).toHaveLength(11);
  });
});
