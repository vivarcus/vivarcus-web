import { api } from "../api/client";
import type { AuditExportJobModel } from "../api/types";
import { defaultAuditChrome, displayText, type AuditChrome } from "./i18n";

export type AuditExportQuery = {
  object_name?: string;
  record_id?: string;
  domain_id?: string;
  time_from?: string;
  time_to?: string;
  action?: string;
  user?: string;
  login_type?: string;
  status?: string;
  vault_id_filter?: string;
  timezone?: string;
  date_format_profile?: string;
  locale?: string;
};

export function auditTypeForPanel(panelKind: string): string {
  switch (panelKind) {
    case "login":
      return "login_audit_trail";
    case "system":
      return "system_audit_trail";
    case "domain":
      return "domain_audit_trail";
    case "object_records":
    case "record_object":
    default:
      return "object_audit_trail";
  }
}

export function localDateTimeInputToRFC3339(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

/** Convert YYYY-MM-DD (date input) to RFC3339 in the browser's local timezone. */
export function localDateInputToRFC3339(value: string, endOfDay = false): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) {
    return localDateTimeInputToRFC3339(trimmed);
  }
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = endOfDay
    ? new Date(year, month, day, 23, 59, 59, 999)
    : new Date(year, month, day, 0, 0, 0, 0);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

/** True when an inclusive date-only range exceeds Veeva Domain Audit History's 2-week cap. */
export function domainDateRangeTooLarge(from: string, to: string): boolean {
  const start = localDateInputToRFC3339(from, false);
  const end = localDateInputToRFC3339(to, true);
  if (!start || !end) return false;
  // Inclusive "Last 2 weeks" (start-of-from through end-of-to) spans just under 15 days.
  return Date.parse(end) - Date.parse(start) > 15 * 24 * 60 * 60 * 1000;
}

import type { DisplayContext } from "./i18n/types";

export function buildExportQuery(
  panelKind: string,
  opts: {
    objectName?: string;
    recordId?: string;
    domainId?: string;
    user?: string;
    action?: string;
    loginType?: string;
    status?: string;
    vaultIdFilter?: string;
    time_from?: string;
    time_to?: string;
    displayContext?: DisplayContext;
  } = {},
): AuditExportQuery {
  const query: AuditExportQuery = {};
  if (opts.domainId && (panelKind === "login" || panelKind === "domain")) {
    query.domain_id = opts.domainId;
  }
  if (panelKind === "object_records" || panelKind === "record_object") {
    if (opts.objectName) query.object_name = opts.objectName;
    if (opts.recordId) query.record_id = opts.recordId;
  }
  if (opts.user) query.user = opts.user;
  if (opts.action) query.action = opts.action;
  if (opts.loginType) query.login_type = opts.loginType;
  if (opts.status) query.status = opts.status;
  if (opts.vaultIdFilter) query.vault_id_filter = opts.vaultIdFilter;
  if (opts.time_from) query.time_from = opts.time_from;
  if (opts.time_to) query.time_to = opts.time_to;
  if (opts.displayContext?.timezone) query.timezone = opts.displayContext.timezone;
  if (opts.displayContext?.date_format_profile) {
    query.date_format_profile = opts.displayContext.date_format_profile;
  }
  if (opts.displayContext?.locale) query.locale = opts.displayContext.locale;
  return query;
}

const POLL_MS = 400;
const MAX_POLLS = 75;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function triggerCsvDownload(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function waitForExportJob(
  vaultId: string,
  jobId: string,
  chrome: AuditChrome,
): Promise<AuditExportJobModel> {
  for (let i = 0; i < MAX_POLLS; i++) {
    const job = await api.getAuditExport(vaultId, jobId);
    if (job.status === "succeeded" || job.status === "failed") {
      return job;
    }
    await sleep(POLL_MS);
  }
  throw new Error(displayText(chrome.export_timeout));
}

export async function runAuditExport(
  vaultId: string,
  auditType: string,
  query: AuditExportQuery,
  domainId?: string,
  chrome: AuditChrome = defaultAuditChrome,
): Promise<void> {
  const job = await api.createAuditExport(vaultId, {
    audit_type: auditType,
    query,
    domain_id: domainId,
  });
  const finished = await waitForExportJob(vaultId, job.id, chrome);
  if (finished.status === "failed") {
    throw new Error(finished.error || displayText(chrome.export_failed));
  }
  const csv = await api.fetchAuditExportCSV(vaultId, job.id);
  const stamp = new Date().toISOString().slice(0, 10);
  triggerCsvDownload(csv, `audit-${auditType}-${stamp}.csv`);
}
