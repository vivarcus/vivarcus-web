import type { ListColumn } from "../api/types";
import {
  FACET_UNDEFINED_VALUE,
  isDateRelativeOp,
  normalizeFacetFilterSpec,
  normalizeFacetFilters,
  type FacetFilterSpec,
  type FacetFilters,
} from "./facetFilters";

const DEFAULT_VIEW_CRITERIA = "";

/**
 * Client-side VQL for Save View. Semantics must match Go
 * internal/ui/objectlist buildFacetFilterClause / buildCompareClauses /
 * buildDateFilterClause (including date preset resolution).
 */

function escapeVQLString(value: string): string {
  return value.replace(/'/g, "''");
}

function quoteVQLString(value: string): string {
  return `'${escapeVQLString(value)}'`;
}

function joinOr(clauses: string[]): string {
  if (clauses.length === 1) {
    return clauses[0];
  }
  return `(${clauses.join(" OR ")})`;
}

function joinAnd(clauses: string[]): string {
  if (clauses.length === 1) {
    return clauses[0];
  }
  return `(${clauses.join(" AND ")})`;
}

function formatContainsClause(fieldExpr: string, values: string[]): string {
  return `${fieldExpr} CONTAINS (${values.map(quoteVQLString).join(", ")})`;
}

/** Matches Go buildObjectRefFieldName. */
function objectRefField(fieldApiName: string): string {
  return `${fieldApiName}.id`;
}

function formatFilterDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function truncateFilterDate(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfFilterWeek(d: Date): Date {
  const day = truncateFilterDate(d);
  // Go time.Weekday: Sunday=0 … Saturday=6 — same as JS getDay().
  day.setDate(day.getDate() - day.getDay());
  return day;
}

function startOfFilterMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfFilterQuarter(d: Date): Date {
  const qStartMonth = Math.floor(d.getMonth() / 3) * 3;
  return new Date(d.getFullYear(), qStartMonth, 1);
}

function startOfFilterYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1);
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d.getTime());
  out.setDate(out.getDate() + n);
  return out;
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, d.getDate());
}

function addYears(d: Date, n: number): Date {
  return new Date(d.getFullYear() + n, d.getMonth(), d.getDate());
}

/** Matches Go resolveDatePresetRange. */
export function resolveDatePresetRange(
  preset: string,
  ref: Date = new Date(),
): { from: string; to: string } | null {
  const name = preset.trim();
  const day = truncateFilterDate(ref);
  switch (name) {
    case "today": {
      const from = formatFilterDate(day);
      return { from, to: from };
    }
    case "yesterday": {
      const from = formatFilterDate(addDays(day, -1));
      return { from, to: from };
    }
    case "this_week": {
      const start = startOfFilterWeek(day);
      return { from: formatFilterDate(start), to: formatFilterDate(addDays(start, 6)) };
    }
    case "last_week": {
      const start = addDays(startOfFilterWeek(day), -7);
      return { from: formatFilterDate(start), to: formatFilterDate(addDays(start, 6)) };
    }
    case "next_week": {
      const start = addDays(startOfFilterWeek(day), 7);
      return { from: formatFilterDate(start), to: formatFilterDate(addDays(start, 6)) };
    }
    case "current_month": {
      const start = startOfFilterMonth(day);
      return {
        from: formatFilterDate(start),
        to: formatFilterDate(addDays(addMonths(start, 1), -1)),
      };
    }
    case "prior_month": {
      const start = addMonths(startOfFilterMonth(day), -1);
      return {
        from: formatFilterDate(start),
        to: formatFilterDate(addDays(startOfFilterMonth(day), -1)),
      };
    }
    case "next_month": {
      const start = addMonths(startOfFilterMonth(day), 1);
      return {
        from: formatFilterDate(start),
        to: formatFilterDate(addDays(addMonths(start, 1), -1)),
      };
    }
    case "current_quarter": {
      const start = startOfFilterQuarter(day);
      return {
        from: formatFilterDate(start),
        to: formatFilterDate(addDays(addMonths(start, 3), -1)),
      };
    }
    case "prior_quarter": {
      const start = addMonths(startOfFilterQuarter(day), -3);
      return {
        from: formatFilterDate(start),
        to: formatFilterDate(addDays(startOfFilterQuarter(day), -1)),
      };
    }
    case "next_quarter": {
      const start = addMonths(startOfFilterQuarter(day), 3);
      return {
        from: formatFilterDate(start),
        to: formatFilterDate(addDays(addMonths(start, 3), -1)),
      };
    }
    case "current_year": {
      const start = startOfFilterYear(day);
      return {
        from: formatFilterDate(start),
        to: formatFilterDate(addDays(addYears(start, 1), -1)),
      };
    }
    case "prior_year": {
      const start = addYears(startOfFilterYear(day), -1);
      return {
        from: formatFilterDate(start),
        to: formatFilterDate(addDays(startOfFilterYear(day), -1)),
      };
    }
    case "next_year": {
      const start = addYears(startOfFilterYear(day), 1);
      return {
        from: formatFilterDate(start),
        to: formatFilterDate(addDays(addYears(start, 1), -1)),
      };
    }
    default:
      return null;
  }
}

/** Matches Go buildCompareClauses. */
function buildCompareClauses(fieldExpr: string, op: string, values: string[]): string[] {
  switch (op) {
    case "blank":
      return [`${fieldExpr} = null`];
    case "not_blank":
      return [`${fieldExpr} != null`];
    case "contains": {
      const parts = values.map((v) => `${fieldExpr} CONTAINS ${quoteVQLString(v)}`);
      return parts.length === 1 ? parts : [joinAnd(parts)];
    }
    case "equals": {
      const parts =
        values.length === 1
          ? [`${fieldExpr} = ${quoteVQLString(values[0])}`]
          : values.map((v) => `${fieldExpr} CONTAINS ${quoteVQLString(v)}`);
      return parts.length === 1 ? parts : [joinAnd(parts)];
    }
    case "not_equal": {
      const parts = values.map((v) => `${fieldExpr} != ${quoteVQLString(v)}`);
      return parts.length === 1 ? parts : [joinAnd(parts)];
    }
    case "in":
    default:
      if (values.length === 1) {
        return [`${fieldExpr} = ${quoteVQLString(values[0])}`];
      }
      return [formatContainsClause(fieldExpr, values)];
  }
}

function buildFacetableClause(
  field: string,
  fieldType: string | undefined,
  spec: FacetFilterSpec,
): string | null {
  const normalized = normalizeFacetFilterSpec(spec);
  const op = normalized.op ?? "in";
  if (op === "blank") {
    return `${field} = null`;
  }
  if (op === "not_blank") {
    return `${field} != null`;
  }

  let fieldExpr = field;
  if (fieldType === "Object" || fieldType === "ObjectReference" || fieldType === "ObjectParent") {
    fieldExpr = objectRefField(field);
  }

  const defined: string[] = [];
  let hasUndefined = false;
  for (const raw of normalized.values ?? []) {
    const value = raw.trim();
    if (!value || value === FACET_UNDEFINED_VALUE) {
      hasUndefined = true;
      continue;
    }
    defined.push(value);
  }

  const parts: string[] = [];
  if (defined.length > 0) {
    parts.push(...buildCompareClauses(fieldExpr, op, defined));
  }
  if (hasUndefined) {
    parts.push(`${field} = null`);
  }
  if (parts.length === 0) {
    return null;
  }
  if (parts.length === 1) {
    return parts[0];
  }
  return joinOr(parts);
}

function buildNumberClause(field: string, spec: FacetFilterSpec): string | null {
  const normalized = normalizeFacetFilterSpec(spec);
  const op = normalized.op ?? "in";
  if (op === "blank") {
    return `${field} = null`;
  }
  if (op === "not_blank") {
    return `${field} != null`;
  }
  const values = (normalized.values ?? []).map((v) => v.trim()).filter(Boolean);
  if (values.length === 0) {
    return null;
  }
  for (const v of values) {
    if (Number.isNaN(Number(v))) {
      return null;
    }
  }
  const parts = values.map((value) => `${field} = ${value}`);
  return parts.length === 1 ? parts[0] : joinOr(parts);
}

function buildBooleanClause(field: string, spec: FacetFilterSpec): string | null {
  const normalized = normalizeFacetFilterSpec(spec);
  const op = normalized.op ?? "in";
  if (op === "blank") {
    return `${field} = null`;
  }
  if (op === "not_blank") {
    return `${field} != null`;
  }
  const values = normalized.values ?? [];
  if (values.length === 0) {
    return null;
  }
  const parts = values.map((value) => `${field} = ${value}`);
  return parts.length === 1 ? parts[0] : joinOr(parts);
}

function parseRelativeCountUnit(values: string[]): { n: number; unit: string } | null {
  if (values.length < 2) {
    return null;
  }
  const n = Number.parseInt(values[0].trim(), 10);
  if (!Number.isFinite(n) || n < 1) {
    return null;
  }
  const unit = values[1].trim().toLowerCase();
  if (!["days", "weeks", "months", "quarters", "years"].includes(unit)) {
    return null;
  }
  return { n, unit };
}

function relativeLastWindow(
  day: Date,
  n: number,
  unit: string,
  fullOnly: boolean,
): { from: Date; to: Date } {
  switch (unit) {
    case "days": {
      if (fullOnly) {
        const to = addDays(day, -1);
        return { from: addDays(to, -(n - 1)), to };
      }
      return { from: addDays(day, -(n - 1)), to: day };
    }
    case "weeks": {
      const curStart = startOfFilterWeek(day);
      if (fullOnly) {
        return { from: addDays(curStart, -7 * n), to: addDays(curStart, -1) };
      }
      return { from: addDays(curStart, -7 * (n - 1)), to: addDays(curStart, 6) };
    }
    case "months": {
      const curStart = startOfFilterMonth(day);
      if (fullOnly) {
        return { from: addMonths(curStart, -n), to: addDays(curStart, -1) };
      }
      return { from: addMonths(curStart, -(n - 1)), to: addDays(addMonths(curStart, 1), -1) };
    }
    case "quarters": {
      const curStart = startOfFilterQuarter(day);
      if (fullOnly) {
        return { from: addMonths(curStart, -3 * n), to: addDays(curStart, -1) };
      }
      return { from: addMonths(curStart, -3 * (n - 1)), to: addDays(addMonths(curStart, 3), -1) };
    }
    case "years": {
      const curStart = startOfFilterYear(day);
      if (fullOnly) {
        return { from: addYears(curStart, -n), to: addDays(curStart, -1) };
      }
      return { from: addYears(curStart, -(n - 1)), to: addDays(addYears(curStart, 1), -1) };
    }
    default:
      return { from: day, to: day };
  }
}

function relativeNextWindow(day: Date, n: number, unit: string): { from: Date; to: Date } {
  switch (unit) {
    case "days":
      return { from: day, to: addDays(day, n - 1) };
    case "weeks": {
      const curStart = startOfFilterWeek(day);
      return { from: curStart, to: addDays(curStart, 7 * n - 1) };
    }
    case "months": {
      const curStart = startOfFilterMonth(day);
      return { from: curStart, to: addDays(addMonths(curStart, n), -1) };
    }
    case "quarters": {
      const curStart = startOfFilterQuarter(day);
      return { from: curStart, to: addDays(addMonths(curStart, 3 * n), -1) };
    }
    case "years": {
      const curStart = startOfFilterYear(day);
      return { from: curStart, to: addDays(addYears(curStart, n), -1) };
    }
    default:
      return { from: day, to: day };
  }
}

/** Matches Go resolveDateRelativeRange. */
export function resolveDateRelativeRange(
  op: string,
  values: string[],
  ref: Date = new Date(),
): { from: string; to: string } | null {
  const parsed = parseRelativeCountUnit(values);
  if (!parsed) {
    return null;
  }
  const day = truncateFilterDate(ref);
  switch (op) {
    case "last_n":
    case "not_last_n": {
      const { from, to } = relativeLastWindow(day, parsed.n, parsed.unit, false);
      return { from: formatFilterDate(from), to: formatFilterDate(to) };
    }
    case "next_n": {
      const { from, to } = relativeNextWindow(day, parsed.n, parsed.unit);
      return { from: formatFilterDate(from), to: formatFilterDate(to) };
    }
    case "last_full_n": {
      const { from, to } = relativeLastWindow(day, parsed.n, parsed.unit, true);
      return { from: formatFilterDate(from), to: formatFilterDate(to) };
    }
    default:
      return null;
  }
}

function buildDateClause(field: string, spec: FacetFilterSpec, ref: Date = new Date()): string | null {
  const normalized = normalizeFacetFilterSpec(spec);
  let op = normalized.op ?? "range";
  let values = [...(normalized.values ?? [])];

  const preset = normalized.preset?.trim();
  if (preset) {
    const range = resolveDatePresetRange(preset, ref);
    if (!range) {
      return null;
    }
    values = [range.from, range.to];
    op = "range";
  }

  if (isDateRelativeOp(op)) {
    const range = resolveDateRelativeRange(op, values, ref);
    if (!range) {
      return null;
    }
    if (op === "not_last_n") {
      return `(${field} = null OR ${field} < ${quoteVQLString(range.from)} OR ${field} > ${quoteVQLString(range.to)})`;
    }
    values = [range.from, range.to];
    op = "range";
  }

  switch (op) {
    case "blank":
      return `${field} = null`;
    case "not_blank":
      return `${field} != null`;
    case "before":
      if (values.length !== 1) {
        return null;
      }
      return `${field} < ${quoteVQLString(values[0])}`;
    case "after":
      if (values.length !== 1) {
        return null;
      }
      return `${field} > ${quoteVQLString(values[0])}`;
    case "equals":
      if (values.length !== 1) {
        return null;
      }
      return `${field} = ${quoteVQLString(values[0])}`;
    case "range":
      if (values.length === 1) {
        return `${field} = ${quoteVQLString(values[0])}`;
      }
      if (values.length === 2) {
        return `(${field} >= ${quoteVQLString(values[0])} AND ${field} <= ${quoteVQLString(values[1])})`;
      }
      return null;
    default:
      return null;
  }
}

function buildClause(
  field: string,
  fieldType: string | undefined,
  spec: FacetFilterSpec,
  ref?: Date,
): string | null {
  switch (fieldType) {
    case "Date":
    case "DateTime":
      return buildDateClause(field, spec, ref);
    case "Number":
      return buildNumberClause(field, spec);
    case "Boolean":
      return buildBooleanClause(field, spec);
    default:
      return buildFacetableClause(field, fieldType, spec);
  }
}

export function facetFiltersToVQL(
  filters: FacetFilters,
  columns: ListColumn[],
  ref: Date = new Date(),
): string {
  const normalized = normalizeFacetFilters(filters);
  const fields = Object.keys(normalized).sort();
  if (fields.length === 0) {
    return DEFAULT_VIEW_CRITERIA;
  }

  const colByField = new Map(columns.map((col) => [col.field_api_name, col]));
  const clauses: string[] = [];
  for (const field of fields) {
    const col = colByField.get(field);
    if (!col) {
      continue;
    }
    const clause = buildClause(field, col.field_type, normalized[field], ref);
    if (clause) {
      clauses.push(clause);
    }
  }
  if (clauses.length === 0) {
    return DEFAULT_VIEW_CRITERIA;
  }
  return joinAnd(clauses);
}

export function savedViewCriteria(detail: { vql_search_criteria?: string }): string {
  return detail.vql_search_criteria?.trim() || DEFAULT_VIEW_CRITERIA;
}
