import { Button, DatePicker, InputNumber, Select } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useMemo } from "react";
import type { DisplayText } from "../api/types";
import { useUi } from "../context/UiContext";
import {
  DATE_FILTER_PRESETS,
  DATE_RELATIVE_UNITS,
  type DateRelativeUnit,
  type FacetFilterOp,
  type FacetFilterSpec,
  isDateRelativeOp,
  normalizeFacetFilterSpec,
} from "../lib/facetFilters";
import { displayText, dateFieldPlaceholder, datePickerInputFormats } from "../lib/i18n";
import type { ListChrome } from "../lib/i18n/chromeTypes";
import { DateFieldInput } from "../renderers/DateFieldInput";

const { RangePicker } = DatePicker;

type DateFilterChrome = Pick<
  ListChrome,
  | "facet_clear_field"
  | "date_filter_range"
  | "date_filter_before"
  | "date_filter_after"
  | "date_filter_equals"
  | "date_filter_blank"
  | "date_filter_not_blank"
  | "date_filter_preset_label"
  | "date_filter_last_n"
  | "date_filter_next_n"
  | "date_filter_not_last_n"
  | "date_filter_last_full_n"
  | "date_unit_days"
  | "date_unit_weeks"
  | "date_unit_months"
  | "date_unit_quarters"
  | "date_unit_years"
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

type Props = {
  filter: FacetFilterSpec;
  disabled?: boolean;
  includeTime?: boolean;
  clearLabel?: DisplayText;
  chrome: DateFilterChrome;
  onChange: (filter: FacetFilterSpec) => void;
  onClear: () => void;
};

const DATE_OPS: FacetFilterOp[] = [
  "range",
  "before",
  "after",
  "equals",
  "last_n",
  "next_n",
  "not_last_n",
  "last_full_n",
  "blank",
  "not_blank",
];

function parseSingleDate(value: string | undefined): Dayjs | null {
  if (!value?.trim()) {
    return null;
  }
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
}

function parseRange(values: string[] | undefined): [Dayjs | null, Dayjs | null] {
  if (!values || values.length === 0) {
    return [null, null];
  }
  const from = parseSingleDate(values[0]);
  const to = parseSingleDate(values[1] ?? values[0]);
  return [from, to];
}

function formatDateValue(value: Dayjs, includeTime: boolean): string {
  return value.format(includeTime ? "YYYY-MM-DDTHH:mm:ss" : "YYYY-MM-DD");
}

function presetLabel(chrome: DateFilterChrome, labelKey: (typeof DATE_FILTER_PRESETS)[number]["labelKey"]) {
  return displayText(chrome[labelKey], labelKey);
}

function opChromeKey(op: FacetFilterOp): keyof DateFilterChrome {
  switch (op) {
    case "range":
      return "date_filter_range";
    case "before":
      return "date_filter_before";
    case "after":
      return "date_filter_after";
    case "equals":
      return "date_filter_equals";
    case "last_n":
      return "date_filter_last_n";
    case "next_n":
      return "date_filter_next_n";
    case "not_last_n":
      return "date_filter_not_last_n";
    case "last_full_n":
      return "date_filter_last_full_n";
    case "blank":
      return "date_filter_blank";
    case "not_blank":
      return "date_filter_not_blank";
    default:
      return "date_filter_range";
  }
}

function unitChromeKey(unit: DateRelativeUnit): keyof DateFilterChrome {
  switch (unit) {
    case "days":
      return "date_unit_days";
    case "weeks":
      return "date_unit_weeks";
    case "months":
      return "date_unit_months";
    case "quarters":
      return "date_unit_quarters";
    case "years":
      return "date_unit_years";
  }
}

export function DateFieldFilterPanel({
  filter,
  disabled,
  includeTime = false,
  clearLabel,
  chrome,
  onChange,
  onClear,
}: Props) {
  const { displayContext } = useUi();
  const format = datePickerInputFormats(displayContext, includeTime);
  const normalized = useMemo(() => normalizeFacetFilterSpec(filter), [filter]);
  const op = (normalized.op ?? "range") as FacetFilterOp;
  const [from, to] = useMemo(() => parseRange(normalized.values), [normalized.values]);
  const singleDate = useMemo(() => parseSingleDate(normalized.values?.[0]), [normalized.values]);
  const relativeCount = isDateRelativeOp(op)
    ? Number.parseInt(normalized.values?.[0] ?? "1", 10) || 1
    : 1;
  const relativeUnit = (
    isDateRelativeOp(op) ? (normalized.values?.[1] as DateRelativeUnit) : "days"
  ) as DateRelativeUnit;

  const operatorOptions = DATE_OPS.map((value) => ({
    value,
    label: displayText(chrome[opChromeKey(value)], value),
  }));

  const presetOptions = DATE_FILTER_PRESETS.map((preset) => ({
    value: preset.id,
    label: presetLabel(chrome, preset.labelKey),
  }));

  const unitOptions = DATE_RELATIVE_UNITS.map((unit) => ({
    value: unit,
    label: displayText(chrome[unitChromeKey(unit)], unit),
  }));

  function updateFilter(next: FacetFilterSpec) {
    onChange(normalizeFacetFilterSpec(next));
  }

  function updateRelative(nextOp: FacetFilterOp, count: number, unit: DateRelativeUnit) {
    updateFilter({ op: nextOp, values: [String(count), unit] });
  }

  return (
    <div className="date-field-filter-panel">
      <Select
        className="date-field-filter-panel__op"
        disabled={disabled}
        value={op}
        options={operatorOptions}
        onChange={(nextOp: FacetFilterOp) => {
          if (nextOp === "blank" || nextOp === "not_blank") {
            updateFilter({ op: nextOp });
            return;
          }
          if (isDateRelativeOp(nextOp)) {
            updateRelative(nextOp, relativeCount, relativeUnit || "days");
            return;
          }
          updateFilter({ op: nextOp, values: normalized.values, preset: undefined });
        }}
      />
      {op === "range" && (
        <>
          <Select
            allowClear
            className="date-field-filter-panel__preset"
            disabled={disabled}
            placeholder={displayText(chrome.date_filter_preset_label, "Preset")}
            value={normalized.preset || undefined}
            options={presetOptions}
            onChange={(preset) => {
              if (!preset) {
                updateFilter({ op: "range", values: normalized.values });
                return;
              }
              updateFilter({ op: "range", preset });
            }}
          />
          {!normalized.preset && (
            <RangePicker
              allowClear
              disabled={disabled}
              format={format}
              placeholder={[
                dateFieldPlaceholder(displayContext, includeTime),
                dateFieldPlaceholder(displayContext, includeTime),
              ]}
              value={from && to ? [from, to] : undefined}
              style={{ width: "100%" }}
              onChange={(range) => {
                if (!range?.[0] || !range[1]) {
                  updateFilter({ op: "range" });
                  return;
                }
                updateFilter({
                  op: "range",
                  values: [
                    formatDateValue(range[0], includeTime),
                    formatDateValue(range[1], includeTime),
                  ],
                });
              }}
            />
          )}
        </>
      )}
      {(op === "before" || op === "after" || op === "equals") &&
        (includeTime ? (
          <DatePicker
            allowClear
            disabled={disabled}
            format={format}
            placeholder={dateFieldPlaceholder(displayContext, includeTime)}
            value={singleDate ?? undefined}
            style={{ width: "100%" }}
            showTime
            onChange={(value) => {
              if (!value) {
                updateFilter({ op });
                return;
              }
              updateFilter({ op, values: [formatDateValue(value, includeTime)] });
            }}
          />
        ) : (
          <DateFieldInput
            allowClear
            disabled={disabled}
            displayContext={displayContext}
            placeholder={dateFieldPlaceholder(displayContext, false)}
            value={normalized.values?.[0]}
            onChange={(iso) => {
              if (!iso) {
                updateFilter({ op });
                return;
              }
              updateFilter({ op, values: [iso] });
            }}
          />
        ))}
      {isDateRelativeOp(op) && (
        <div className="date-field-filter-panel__relative">
          <InputNumber
            min={1}
            disabled={disabled}
            value={relativeCount}
            style={{ width: "40%" }}
            onChange={(value) => {
              const count = typeof value === "number" && value >= 1 ? Math.trunc(value) : 1;
              updateRelative(op, count, relativeUnit || "days");
            }}
          />
          <Select
            disabled={disabled}
            value={DATE_RELATIVE_UNITS.includes(relativeUnit) ? relativeUnit : "days"}
            options={unitOptions}
            style={{ width: "60%" }}
            onChange={(unit: DateRelativeUnit) => updateRelative(op, relativeCount, unit)}
          />
        </div>
      )}
      {!facetFilterSpecIsActive(normalized) ? null : (
        <Button type="link" size="small" disabled={disabled} onClick={onClear}>
          {displayText(clearLabel, "Clear")}
        </Button>
      )}
    </div>
  );
}

function facetFilterSpecIsActive(spec: FacetFilterSpec): boolean {
  const normalized = normalizeFacetFilterSpec(spec);
  if (normalized.op === "blank" || normalized.op === "not_blank") {
    return true;
  }
  return Boolean(normalized.preset) || (normalized.values?.length ?? 0) > 0;
}
