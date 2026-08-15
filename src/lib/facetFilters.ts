import type { ListColumn } from "../api/types";

export const FACET_UNDEFINED_VALUE = "__undefined__";

export type FacetFilterOp =
  | "in"
  | "equals"
  | "not_equal"
  | "contains"
  | "blank"
  | "not_blank"
  | "range"
  | "before"
  | "after"
  | "last_n"
  | "next_n"
  | "not_last_n"
  | "last_full_n";

export type DateRelativeUnit = "days" | "weeks" | "months" | "quarters" | "years";

export const DATE_RELATIVE_UNITS: DateRelativeUnit[] = [
  "days",
  "weeks",
  "months",
  "quarters",
  "years",
];

export function isDateRelativeOp(op: string | undefined): boolean {
  return op === "last_n" || op === "next_n" || op === "not_last_n" || op === "last_full_n";
}

export type FacetFilterSpec = {
  op?: FacetFilterOp;
  values?: string[];
  preset?: string;
};

export type FacetFilters = Record<string, FacetFilterSpec>;

export const EMPTY_FACET_FILTERS: FacetFilters = {};

export const DATE_FILTER_PRESETS = [
  { id: "today", labelKey: "date_preset_today" as const },
  { id: "yesterday", labelKey: "date_preset_yesterday" as const },
  { id: "this_week", labelKey: "date_preset_this_week" as const },
  { id: "last_week", labelKey: "date_preset_last_week" as const },
  { id: "next_week", labelKey: "date_preset_next_week" as const },
  { id: "current_month", labelKey: "date_preset_current_month" as const },
  { id: "prior_month", labelKey: "date_preset_prior_month" as const },
  { id: "next_month", labelKey: "date_preset_next_month" as const },
  { id: "current_quarter", labelKey: "date_preset_current_quarter" as const },
  { id: "prior_quarter", labelKey: "date_preset_prior_quarter" as const },
  { id: "next_quarter", labelKey: "date_preset_next_quarter" as const },
  { id: "current_year", labelKey: "date_preset_current_year" as const },
  { id: "prior_year", labelKey: "date_preset_prior_year" as const },
  { id: "next_year", labelKey: "date_preset_next_year" as const },
] as const;

export type DateFilterPresetId = (typeof DATE_FILTER_PRESETS)[number]["id"];

export function normalizeFacetFilterSpec(spec: FacetFilterSpec | string[] | undefined | null): FacetFilterSpec {
  if (!spec) {
    return {};
  }
  if (Array.isArray(spec)) {
    const values = spec.map(String).filter((value) => value.trim() !== "");
    return values.length > 0 ? { op: "in", values } : {};
  }
  const op = (spec.op?.trim() || "in") as FacetFilterOp;
  const values = (spec.values ?? []).map(String).filter((value) => value.trim() !== "");
  const preset = spec.preset?.trim() || "";
  if (op === "blank" || op === "not_blank") {
    return { op };
  }
  if (isDateRelativeOp(op)) {
    if (values.length < 2) {
      return {};
    }
    const count = values[0].trim();
    const unit = values[1].trim().toLowerCase();
    if (!count || Number.isNaN(Number(count)) || Number(count) < 1) {
      return {};
    }
    if (!DATE_RELATIVE_UNITS.includes(unit as DateRelativeUnit)) {
      return {};
    }
    return { op, values: [String(Math.trunc(Number(count))), unit] };
  }
  if (preset) {
    return { op: op === "in" ? "range" : op, preset, values: values.length > 0 ? values : undefined };
  }
  if (values.length === 0) {
    return {};
  }
  return { op, values };
}

export function facetFilterSpecIsEmpty(spec: FacetFilterSpec | undefined): boolean {
  const normalized = normalizeFacetFilterSpec(spec);
  if (normalized.op === "blank" || normalized.op === "not_blank") {
    return false;
  }
  return !normalized.preset && (normalized.values?.length ?? 0) === 0;
}

export function normalizeFacetFilters(filters: FacetFilters | undefined | null): FacetFilters {
  if (!filters) {
    return EMPTY_FACET_FILTERS;
  }
  const out: FacetFilters = {};
  for (const [field, spec] of Object.entries(filters)) {
    const normalized = normalizeFacetFilterSpec(spec);
    if (!facetFilterSpecIsEmpty(normalized)) {
      out[field] = normalized;
    }
  }
  return out;
}

export function hasFacetFilters(filters: FacetFilters): boolean {
  return Object.keys(normalizeFacetFilters(filters)).length > 0;
}

export function facetFiltersEqual(a: FacetFilters, b: FacetFilters): boolean {
  const left = normalizeFacetFilters(a);
  const right = normalizeFacetFilters(b);
  const aKeys = Object.keys(left);
  const bKeys = Object.keys(right);
  if (aKeys.length !== bKeys.length) {
    return false;
  }
  for (const key of aKeys) {
    const l = left[key];
    const r = right[key];
    if ((l.op ?? "in") !== (r.op ?? "in") || (l.preset ?? "") !== (r.preset ?? "")) {
      return false;
    }
    const lValues = [...(l.values ?? [])].sort();
    const rValues = [...(r.values ?? [])].sort();
    if (lValues.length !== rValues.length) {
      return false;
    }
    for (let i = 0; i < lValues.length; i++) {
      if (lValues[i] !== rValues[i]) {
        return false;
      }
    }
  }
  return true;
}

export function getFacetFilterValues(filters: FacetFilters, fieldApiName: string): string[] {
  return [...(normalizeFacetFilters(filters)[fieldApiName]?.values ?? [])];
}

export function serializeFacetFilterSpec(spec: FacetFilterSpec): unknown {
  const normalized = normalizeFacetFilterSpec(spec);
  if (facetFilterSpecIsEmpty(normalized)) {
    return undefined;
  }
  if (
    !normalized.preset &&
    (normalized.op === undefined || normalized.op === "in") &&
    normalized.values
  ) {
    return normalized.values;
  }
  return normalized;
}

export function serializeFacetFilters(filters: FacetFilters): string | undefined {
  const normalized = normalizeFacetFilters(filters);
  const entries = Object.entries(normalized);
  if (entries.length === 0) {
    return undefined;
  }
  const payload: Record<string, unknown> = {};
  for (const [field, spec] of entries) {
    payload[field] = serializeFacetFilterSpec(spec);
  }
  return JSON.stringify(payload);
}

export function parseFacetFilters(raw: string | null | undefined): FacetFilters {
  if (!raw?.trim()) {
    return EMPTY_FACET_FILTERS;
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, FacetFilterSpec | string[]>;
    if (!parsed || typeof parsed !== "object") {
      return EMPTY_FACET_FILTERS;
    }
    return normalizeFacetFilters(parsed);
  } catch {
    return EMPTY_FACET_FILTERS;
  }
}

export function supportsAdvancedFacetMode(column: Pick<ListColumn, "field_type">): boolean {
  switch (column.field_type) {
    case "Picklist":
    case "Object":
    case "ObjectReference":
    case "ObjectParent":
    case "users":
      return true;
    default:
      return false;
  }
}

export function isDateLikeFieldType(fieldType: string | undefined): boolean {
  return fieldType === "Date" || fieldType === "DateTime";
}

export function isNumberFieldType(fieldType: string | undefined): boolean {
  return fieldType === "Number";
}

export function facetFilterUsesAdvancedUi(spec: FacetFilterSpec | undefined): boolean {
  const normalized = normalizeFacetFilterSpec(spec);
  const op = normalized.op ?? "in";
  return op !== "in";
}

export function datePresetLabelKey(preset: string): string {
  const match = DATE_FILTER_PRESETS.find((item) => item.id === preset);
  return match?.labelKey ?? preset;
}
