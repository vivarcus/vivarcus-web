import type { PicklistEntryOption } from "../../api/types";
import {
  formatDateDisplayValue,
  formatDateTimeDisplayValue,
  formatTimeDisplayValue,
  parseTimeToUtcDate,
} from "./dateFormat";
import { formatNumberDisplayValue } from "./numberFormat";
import type { DisplayContext } from "./types";
import { defaultDisplayContext } from "./types";

export function picklistDisplayLabel(
  value: unknown,
  options?: PicklistEntryOption[],
): string {
  return picklistDisplayLabels(value, options);
}

export function picklistDisplayLabels(
  value: unknown,
  options?: PicklistEntryOption[],
): string {
  const names = Array.isArray(value)
    ? value.map((item) => String(item)).filter(Boolean)
    : value == null || value === ""
      ? []
      : [String(value)];
  if (names.length === 0) {
    return "";
  }
  const selected = new Set(names);
  const orderedLabels = [...(options ?? [])]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name))
    .filter((entry) => selected.has(entry.name))
    .map((entry) => entry.label);
  if (orderedLabels.length > 0) {
    return orderedLabels.join(", ");
  }
  return names.join(", ");
}

/** Prefer canonical stored values for types the UI can localize from metadata. */
export function resolveDisplayFormatValue(
  value: unknown,
  fieldType: string | undefined,
  displayValue?: unknown,
): unknown {
  if (fieldType === "Boolean" || fieldType === "Picklist") {
    if (value != null && value !== "") {
      return value;
    }
  }
  if (displayValue !== undefined) {
    return displayValue;
  }
  return value;
}

function parseBooleanDisplay(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }
  const text = String(value).trim().toLowerCase();
  if (text === "true" || text === "1" || text === "yes") {
    return true;
  }
  if (text === "false" || text === "0" || text === "no") {
    return false;
  }
  return null;
}

/** True/false tokens only — never treat numeric 1/0 as boolean (Number fields use those). */
function parseStrictBooleanDisplay(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }
  const text = String(value).trim().toLowerCase();
  if (text === "true" || text === "yes") {
    return true;
  }
  if (text === "false" || text === "no") {
    return false;
  }
  return null;
}

function formatNumberDisplay(
  value: unknown,
  ctx: DisplayContext | undefined,
): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return formatNumberDisplayValue(value, ctx);
  }
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return null;
    const num = Number(text);
    if (!Number.isFinite(num)) return null;
    return formatNumberDisplayValue(num, ctx);
  }
  return null;
}

/** Formats field values for display using locale/timezone seams (canonical values unchanged). */
export function formatFieldDisplayValue(
  value: unknown,
  fieldType: string | undefined,
  ctx: DisplayContext | undefined,
  picklistOptions?: PicklistEntryOption[],
): string {
  if (value == null) return "";
  const language = ctx?.language ?? defaultDisplayContext.language;

  // Boolean only: accept 1/0. Do not apply this to Number — "# Expected"=1 was showing as 是.
  if (fieldType === "Boolean") {
    const boolVal = parseBooleanDisplay(value);
    if (boolVal === null) {
      return String(value);
    }
    return formatBoolean(boolVal, language);
  }

  if (fieldType === "Number" || fieldType === "Currency") {
    const formatted = formatNumberDisplay(value, ctx);
    if (formatted != null) {
      return formatted;
    }
  }

  // Formula boolean results (e.g. overcount__v) arrive as "true"/"false", not 1/0.
  if (fieldType === "Formula") {
    const boolVal = parseStrictBooleanDisplay(value);
    if (boolVal !== null) {
      return formatBoolean(boolVal, language);
    }
  }

  if (fieldType === "Date" || fieldType === "DateTime" || fieldType === "Time") {
    const text = String(value).trim();
    if (!text) return "";
    try {
      if (fieldType === "Time") {
        const time = parseTimeToUtcDate(text);
        if (!time) return text;
        return formatTimeDisplayValue(time, ctx);
      }
      const date = parseDateValue(text);
      if (!date) return text;
      if (fieldType === "DateTime") {
        return formatDateTimeDisplayValue(date, ctx);
      }
      return formatDateDisplayValue(date, ctx);
    } catch {
      return text;
    }
  }

  if (fieldType === "Picklist") {
    return picklistDisplayLabels(value, picklistOptions);
  }

  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function parseDateValue(raw: string): Date | null {
  const ms = Date.parse(raw);
  if (Number.isNaN(ms)) return null;
  return new Date(ms);
}

function formatBoolean(value: boolean, language: string): string {
  if (language.startsWith("zh")) {
    return value ? "是" : "否";
  }
  return value ? "Yes" : "No";
}
