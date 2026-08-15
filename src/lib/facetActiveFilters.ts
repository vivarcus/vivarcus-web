import type { DisplayText, FacetFieldResult, ListColumn } from "../api/types";
import {
  FACET_UNDEFINED_VALUE,
  DATE_RELATIVE_UNITS,
  datePresetLabelKey,
  isDateLikeFieldType,
  isDateRelativeOp,
  isNumberFieldType,
  normalizeFacetFilterSpec,
  type DateRelativeUnit,
  type FacetFilterSpec,
  type FacetFilters,
} from "./facetFilters";
import { displayText } from "./i18n";
import type { ListChrome } from "./i18n/chromeTypes";

export type ActiveFacetSelection = {
  fieldApiName: string;
  fieldLabel: string;
  value: string;
  valueLabel: string;
};

type ActiveFacetChrome = Pick<
  ListChrome,
  | "facet_undefined"
  | "facet_op_equals"
  | "facet_op_not_equal"
  | "facet_op_contains"
  | "facet_op_blank"
  | "facet_op_not_blank"
  | "date_filter_range"
  | "date_filter_before"
  | "date_filter_after"
  | "date_filter_equals"
  | "date_filter_blank"
  | "date_filter_not_blank"
  | "date_filter_last_n"
  | "date_filter_next_n"
  | "date_filter_not_last_n"
  | "date_filter_last_full_n"
  | "date_unit_days"
  | "date_unit_weeks"
  | "date_unit_months"
  | "date_unit_quarters"
  | "date_unit_years"
  | "number_filter_equals"
  | "number_filter_blank"
  | "number_filter_not_blank"
  | "date_preset_today"
  | "date_preset_yesterday"
  | "date_preset_this_week"
  | "date_preset_last_week"
  | "date_preset_next_week"
  | "date_preset_current_month"
  | "date_preset_prior_month"
  | "date_preset_next_month"
  | "date_preset_current_quarter"
  | "date_preset_prior_quarter"
  | "date_preset_next_quarter"
  | "date_preset_current_year"
  | "date_preset_prior_year"
  | "date_preset_next_year"
>;

function resolveValueLabel(
  value: string,
  fieldFacet: FacetFieldResult | undefined,
  chrome: ActiveFacetChrome,
): string {
  if (value === FACET_UNDEFINED_VALUE) {
    return displayText(chrome.facet_undefined, "(undefined)");
  }
  const facetValue = fieldFacet?.values.find((item) => item.value === value);
  return displayText(facetValue?.label, value);
}

function withOp(opLabel: string, valueText: string): string {
  return `${opLabel}: ${valueText}`;
}

function unitLabel(chrome: ActiveFacetChrome, unit: string): string {
  const key = (
    DATE_RELATIVE_UNITS.includes(unit as DateRelativeUnit)
      ? (`date_unit_${unit}` as const)
      : "date_unit_days"
  ) as keyof ActiveFacetChrome;
  return displayText(chrome[key] as DisplayText | undefined, unit);
}

function relativeOpLabel(chrome: ActiveFacetChrome, op: string): string {
  switch (op) {
    case "last_n":
      return displayText(chrome.date_filter_last_n, "is in the last");
    case "next_n":
      return displayText(chrome.date_filter_next_n, "is in the next");
    case "not_last_n":
      return displayText(chrome.date_filter_not_last_n, "is not in the last");
    case "last_full_n":
      return displayText(chrome.date_filter_last_full_n, "is in the last full");
    default:
      return op;
  }
}

function formatDateSelection(
  fieldApiName: string,
  fieldLabel: string,
  normalized: FacetFilterSpec,
  chrome: ActiveFacetChrome,
): ActiveFacetSelection[] {
  if (normalized.op === "blank" || normalized.op === "not_blank") {
    const valueLabel =
      normalized.op === "blank"
        ? displayText(chrome.date_filter_blank, "is blank")
        : displayText(chrome.date_filter_not_blank, "is not blank");
    return [{ fieldApiName, fieldLabel, value: normalized.op, valueLabel }];
  }

  if (isDateRelativeOp(normalized.op)) {
    const count = normalized.values?.[0] ?? "";
    const unit = normalized.values?.[1] ?? "days";
    return [
      {
        fieldApiName,
        fieldLabel,
        value: `${count},${unit}`,
        valueLabel: withOp(
          relativeOpLabel(chrome, normalized.op ?? "last_n"),
          `${count} ${unitLabel(chrome, unit)}`,
        ),
      },
    ];
  }

  const rangeOp = displayText(chrome.date_filter_range, "is in the range");
  if (normalized.preset) {
    const presetKey = datePresetLabelKey(normalized.preset) as keyof ActiveFacetChrome;
    const presetLabel = displayText(
      chrome[presetKey] as DisplayText | undefined,
      normalized.preset,
    );
    return [
      {
        fieldApiName,
        fieldLabel,
        value: normalized.preset,
        valueLabel: withOp(rangeOp, presetLabel),
      },
    ];
  }

  const values = normalized.values ?? [];
  const op = normalized.op ?? "range";
  if (op === "before" && values.length === 1) {
    return [
      {
        fieldApiName,
        fieldLabel,
        value: values[0],
        valueLabel: withOp(displayText(chrome.date_filter_before, "is before"), values[0]),
      },
    ];
  }
  if (op === "after" && values.length === 1) {
    return [
      {
        fieldApiName,
        fieldLabel,
        value: values[0],
        valueLabel: withOp(displayText(chrome.date_filter_after, "is after"), values[0]),
      },
    ];
  }
  if (op === "equals" && values.length === 1) {
    return [
      {
        fieldApiName,
        fieldLabel,
        value: values[0],
        valueLabel: withOp(displayText(chrome.date_filter_equals, "equals"), values[0]),
      },
    ];
  }
  if (values.length >= 2) {
    return [
      {
        fieldApiName,
        fieldLabel,
        value: values.join(","),
        valueLabel: withOp(rangeOp, `${values[0]} – ${values[1]}`),
      },
    ];
  }
  if (values.length === 1) {
    return [
      {
        fieldApiName,
        fieldLabel,
        value: values[0],
        valueLabel: withOp(rangeOp, values[0]),
      },
    ];
  }
  return [];
}

function formatNumberSelection(
  fieldApiName: string,
  fieldLabel: string,
  normalized: FacetFilterSpec,
  chrome: ActiveFacetChrome,
): ActiveFacetSelection[] {
  if (normalized.op === "blank" || normalized.op === "not_blank") {
    const valueLabel =
      normalized.op === "blank"
        ? displayText(chrome.number_filter_blank, "is blank")
        : displayText(chrome.number_filter_not_blank, "is not blank");
    return [{ fieldApiName, fieldLabel, value: normalized.op, valueLabel }];
  }
  const values = normalized.values ?? [];
  if (values.length === 0) {
    return [];
  }
  return [
    {
      fieldApiName,
      fieldLabel,
      value: values.join(","),
      valueLabel: withOp(displayText(chrome.number_filter_equals, "equals"), values.join(", ")),
    },
  ];
}

export function formatActiveFacetSelections(args: {
  filters: FacetFilters;
  columns: ListColumn[];
  facetFields?: FacetFieldResult[];
  chrome: ActiveFacetChrome;
}): ActiveFacetSelection[] {
  const { filters, columns, facetFields, chrome } = args;
  const colByField = new Map(columns.map((col) => [col.field_api_name, col]));
  const fieldByName = new Map((facetFields ?? []).map((field) => [field.field_api_name, field]));

  return Object.entries(filters).flatMap(([fieldApiName, spec]) => {
    const normalized = normalizeFacetFilterSpec(spec);
    const column = colByField.get(fieldApiName);
    const fieldLabel = displayText(column?.label, fieldApiName);
    const fieldFacet = fieldByName.get(fieldApiName);
    const fieldType = column?.field_type;

    if (isDateLikeFieldType(fieldType)) {
      return formatDateSelection(fieldApiName, fieldLabel, normalized, chrome);
    }
    if (isNumberFieldType(fieldType)) {
      return formatNumberSelection(fieldApiName, fieldLabel, normalized, chrome);
    }

    if (normalized.op === "blank" || normalized.op === "not_blank") {
      const valueLabel =
        normalized.op === "blank"
          ? displayText(chrome.facet_op_blank, "is blank")
          : displayText(chrome.facet_op_not_blank, "is not blank");
      return [{ fieldApiName, fieldLabel, value: normalized.op, valueLabel }];
    }

    const op = normalized.op ?? "in";
    const values = normalized.values ?? [];
    if (op !== "in" && values.length > 0) {
      const opLabel =
        op === "equals"
          ? displayText(chrome.facet_op_equals, "equals")
          : op === "not_equal"
            ? displayText(chrome.facet_op_not_equal, "is not equal to")
            : op === "contains"
              ? displayText(chrome.facet_op_contains, "contains")
              : op;
      const rendered = values.map((value) => resolveValueLabel(value, fieldFacet, chrome));
      return [
        {
          fieldApiName,
          fieldLabel,
          value: values.join(","),
          valueLabel: withOp(opLabel, rendered.join(", ")),
        },
      ];
    }

    return values.map((value) => ({
      fieldApiName,
      fieldLabel,
      value,
      valueLabel: resolveValueLabel(value, fieldFacet, chrome),
    }));
  });
}
