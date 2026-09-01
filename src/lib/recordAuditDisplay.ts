import { defaultAuditChrome, displayTextTemplate, type AuditChrome } from "./i18n";

export function auditTrailModalTitle(
  objectLabel: string,
  recordDisplayName: string,
  chrome: AuditChrome = defaultAuditChrome,
): string {
  const object = objectLabel.trim();
  const record = recordDisplayName.trim();
  if (!object) return displayTextTemplate(chrome.trail_title, {}, "Audit trail");
  if (!record) {
    return displayTextTemplate(
      chrome.trail_title_for,
      { object, record: object },
      `Audit trail for ${object}`,
    );
  }
  return displayTextTemplate(
    chrome.trail_title_for,
    { object, record },
    `Audit trail for ${object} : ${object}: ${record}`,
  );
}

export function formatAuditRecordCellLabel(
  objectLabel: string,
  recordDisplayName: string,
): string {
  const object = objectLabel.trim();
  const record = recordDisplayName.trim();
  if (!object) return record;
  if (!record) return object;
  return `${object} : ${record}`;
}

export function enrichRecordAuditRows(
  rows: Array<Record<string, unknown>>,
  recordCell?: string,
  chrome: AuditChrome = defaultAuditChrome,
  primary?: { objectName: string; recordId: string },
): Array<Record<string, unknown>> {
  const fixedRecord = recordCell?.trim();
  return rows.map((row) => {
    const isPrimary = isPrimaryAuditRow(row, primary);
    const recordLabel = isPrimary && fixedRecord ? fixedRecord : formatAuditRecordCell(row);
    const next: Record<string, unknown> = {
      ...row,
      record: recordLabel,
      user_name: formatAuditUserName(row, chrome),
    };
    if (isPrimary && fixedRecord && isCreateAction(row)) {
      next.event_description = displayTextTemplate(
        chrome.item_created,
        { item: fixedRecord },
        `${fixedRecord} created`,
      );
      next.item = fixedRecord;
    }
    return next;
  });
}

function isPrimaryAuditRow(
  row: Record<string, unknown>,
  primary?: { objectName: string; recordId: string },
): boolean {
  if (!primary?.objectName || !primary.recordId) {
    return true;
  }
  return (
    String(row.object_name ?? "").trim() === primary.objectName &&
    String(row.record_id ?? "").trim() === primary.recordId
  );
}

function isCreateAction(row: Record<string, unknown>): boolean {
  return String(row.action ?? "").trim().toLowerCase() === "create";
}

function formatAuditRecordCell(row: Record<string, unknown>): string {
  const existing = row.record;
  if (existing != null && String(existing).trim()) {
    return String(existing);
  }
  const label = String(row.object_label ?? "").trim();
  const item = typeof row.item === "string" ? row.item.trim() : "";
  if (label && item && !looksLikeObjectApiItem(item, row)) {
    const parts = item.split(" : ").map((part) => part.trim()).filter(Boolean);
    const recordName = parts[parts.length - 1];
    if (recordName && recordName !== label) {
      return `${label} : ${recordName}`;
    }
    return item;
  }
  if (item && !looksLikeObjectApiItem(item, row)) {
    return item;
  }
  const fallbackLabel = label || String(row.object_name ?? "").trim();
  const recordId = String(row.record_id ?? "").trim();
  if (fallbackLabel && recordId) {
    return `${fallbackLabel} : ${recordId}`;
  }
  return fallbackLabel || recordId;
}

function looksLikeObjectApiItem(item: string, row: Record<string, unknown>): boolean {
  const objectName = String(row.object_name ?? "").trim();
  const recordId = String(row.record_id ?? "").trim();
  if (!objectName || !recordId) {
    return false;
  }
  return item === `${objectName} ${recordId}`;
}

function formatAuditUserName(
  row: Record<string, unknown>,
  chrome: AuditChrome,
): string {
  const userName = String(row.user_name ?? "").trim();
  const onBehalf = String(row.on_behalf_of ?? "").trim();
  if (userName.toLowerCase() === "system" && onBehalf && onBehalf.includes("@")) {
    return displayTextTemplate(
      chrome.on_behalf_of,
      { user: userName, principal: onBehalf },
      `${userName} on behalf of ${onBehalf}`,
    );
  }
  return userName;
}

export function auditResultsSummaryRange(
  rows: Array<Record<string, unknown>>,
  timeFrom?: string,
  timeTo?: string,
  now: Date = new Date(),
): { from: string; to: string } {
  const today = formatSummaryDate(localISODate(now));
  if (timeFrom?.trim() && timeTo?.trim()) {
    return { from: formatSummaryDate(timeFrom), to: formatSummaryDate(timeTo) };
  }
  if (timeFrom?.trim()) {
    return { from: formatSummaryDate(timeFrom), to: today };
  }
  if (timeTo?.trim()) {
    return { from: oldestEventDate(rows) ?? "—", to: formatSummaryDate(timeTo) };
  }
  return { from: oldestEventDate(rows) ?? "—", to: today };
}

function oldestEventDate(rows: Array<Record<string, unknown>>): string | undefined {
  const timestamps = rows
    .map((row) => String(row.timestamp ?? "").trim())
    .filter(Boolean);
  if (timestamps.length === 0) return undefined;
  return dateOnlyFromTimestamp(timestamps[timestamps.length - 1]);
}

function dateOnlyFromTimestamp(value: string): string {
  const trimmed = value.trim();
  const ddMmmYyyy = /^(\d{1,2} [A-Za-z]{3} \d{4})/.exec(trimmed);
  if (ddMmmYyyy) return ddMmmYyyy[1];
  const mdY = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(trimmed);
  if (mdY) {
    const parsed = new Date(Number(mdY[3]), Number(mdY[1]) - 1, Number(mdY[2]));
    return parsed.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  return formatSummaryDate(value);
}

function localISODate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function relatedAuditStorageKey(vaultId: string, objectName: string): string {
  return `vivarcus.audit.includeRelated:${vaultId}:${objectName}`;
}

export function loadRelatedAuditSelection(key: string): string[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((value): value is string => typeof value === "string" && value.trim() !== "")
      .map((value) => value.trim())
      .slice(0, 10);
  } catch {
    return [];
  }
}

export function saveRelatedAuditSelection(key: string, objectNames: string[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    const names = objectNames
      .filter((value) => value.trim() !== "")
      .map((value) => value.trim())
      .slice(0, 10);
    if (names.length === 0) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, JSON.stringify(names));
  } catch {
    // quota / private mode
  }
}

function formatSummaryDate(iso: string): string {
  const trimmed = iso.trim();
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (dateOnly) {
    const parsed = new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
    return parsed.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
