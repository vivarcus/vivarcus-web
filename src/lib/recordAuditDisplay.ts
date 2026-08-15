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
): Array<Record<string, unknown>> {
  const fixedRecord = recordCell?.trim();
  return rows.map((row) => {
    const next: Record<string, unknown> = {
      ...row,
      record: fixedRecord || formatAuditRecordCell(row),
      user_name: formatAuditUserName(row, chrome),
    };
    if (fixedRecord && isCreateAction(row)) {
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

function isCreateAction(row: Record<string, unknown>): boolean {
  return String(row.action ?? "").trim().toLowerCase() === "create";
}

function formatAuditRecordCell(row: Record<string, unknown>): string {
  const existing = row.record;
  if (existing != null && String(existing).trim()) {
    return String(existing);
  }
  const item = row.item;
  if (typeof item === "string" && item.trim() && !looksLikeObjectApiItem(item, row)) {
    return item;
  }
  const label = String(row.object_label ?? row.object_name ?? "").trim();
  const recordId = String(row.record_id ?? "").trim();
  if (label && recordId) {
    return `${label} : ${recordId}`;
  }
  return label || recordId;
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
): { from: string; to: string } {
  if (timeFrom && timeTo) {
    return { from: formatSummaryDate(timeFrom), to: formatSummaryDate(timeTo) };
  }
  const timestamps = rows
    .map((row) => String(row.timestamp ?? "").trim())
    .filter(Boolean);
  if (timestamps.length === 0) {
    return { from: "—", to: "—" };
  }
  return { from: timestamps[timestamps.length - 1], to: timestamps[0] };
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
