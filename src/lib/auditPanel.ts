import type { AuditPanelModel } from "../api/types";
import { defaultAuditChrome, displayText, type AuditChrome } from "./i18n";

export type AuditPanelKind = "login" | "system" | "object_records" | "domain";

/** One-shot object-audit load cap (backend maxPageSize). UI scrolls; overflow prompts export. */
export const OBJECT_AUDIT_DISPLAY_LIMIT = 500;

const PANEL_KINDS: AuditPanelKind[] = ["login", "system", "domain", "object_records"];

export function parseAuditPanelKind(value: string | null | undefined): AuditPanelKind | null {
  if (!value) return null;
  return PANEL_KINDS.includes(value as AuditPanelKind) ? (value as AuditPanelKind) : null;
}

export function auditPanelLabel(
  kind: AuditPanelKind,
  chrome: AuditChrome = defaultAuditChrome,
): string {
  switch (kind) {
    case "login":
      return displayText(chrome.panel_login);
    case "system":
      return displayText(chrome.panel_system);
    case "domain":
      return displayText(chrome.panel_domain);
    case "object_records":
      return displayText(chrome.panel_object_records);
  }
}

export function auditChromeFromModel(model: AuditPanelModel | null | undefined): AuditChrome {
  return { ...defaultAuditChrome, ...(model?.chrome ?? {}) };
}

export function auditPanelRows(model: AuditPanelModel): Array<Record<string, unknown>> {
  return (
    model.object_rows ??
    model.login_rows ??
    model.system_rows ??
    model.domain_rows ??
    []
  );
}
