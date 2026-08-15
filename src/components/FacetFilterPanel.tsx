import { Button, Checkbox, Collapse, Input, Select, Spin } from "antd";
import { useMemo, useState } from "react";
import type { FacetFieldResult, ListColumn } from "../api/types";
import {
  FACET_UNDEFINED_VALUE,
  type FacetFilterOp,
  type FacetFilterSpec,
  type FacetFilters,
  facetFilterUsesAdvancedUi,
  getFacetFilterValues,
  normalizeFacetFilterSpec,
  normalizeFacetFilters,
  supportsAdvancedFacetMode,
  isDateLikeFieldType,
  isNumberFieldType,
} from "../lib/facetFilters";
import { displayText } from "../lib/i18n";
import type { ListChrome } from "../lib/i18n/chromeTypes";
import { DateFieldFilterPanel } from "./DateFieldFilterPanel";
import { NumberFieldFilterPanel } from "./NumberFieldFilterPanel";

export const FACET_SEARCH_THRESHOLD = 50;

export { FACET_UNDEFINED_VALUE, EMPTY_FACET_FILTERS, type FacetFilters } from "../lib/facetFilters";
export {
  facetFiltersEqual,
  hasFacetFilters,
  normalizeFacetFilters,
  parseFacetFilters,
  serializeFacetFilters,
} from "../lib/facetFilters";

type FacetChrome = Pick<
  ListChrome,
  | "facet_undefined"
  | "facet_search_placeholder"
  | "facet_clear_field"
  | "facet_loading"
  | "facet_advanced"
  | "facet_basic"
  | "facet_op_in"
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
  | "number_filter_equals"
  | "number_filter_blank"
  | "number_filter_not_blank"
  | "number_filter_value_placeholder"
>;

const ADVANCED_OPS: FacetFilterOp[] = [
  "in",
  "equals",
  "not_equal",
  "contains",
  "blank",
  "not_blank",
];

type FacetFieldPanelProps = {
  field: FacetFieldResult;
  column?: ListColumn;
  filter: FacetFilterSpec;
  disabled?: boolean;
  chrome: FacetChrome;
  onChange: (filter: FacetFilterSpec) => void;
  onClear: () => void;
};

function sortFacetValues(
  values: FacetFieldResult["values"],
  selectedValues: string[],
): FacetFieldResult["values"] {
  const selected = new Set(selectedValues);
  const pinned = values.filter((item) => selected.has(item.value));
  const rest = values.filter((item) => !selected.has(item.value));
  return [...pinned, ...rest];
}

function facetOpLabel(chrome: FacetChrome, op: FacetFilterOp): string {
  switch (op) {
    case "in":
      return displayText(chrome.facet_op_in, "in");
    case "equals":
      return displayText(chrome.facet_op_equals, "equals");
    case "not_equal":
      return displayText(chrome.facet_op_not_equal, "is not equal to");
    case "contains":
      return displayText(chrome.facet_op_contains, "contains");
    case "blank":
      return displayText(chrome.facet_op_blank, "is blank");
    case "not_blank":
      return displayText(chrome.facet_op_not_blank, "is not blank");
    default:
      return op;
  }
}

export function FacetFieldPanel({
  field,
  column,
  filter,
  disabled,
  chrome,
  onChange,
  onClear,
}: FacetFieldPanelProps) {
  const normalized = normalizeFacetFilterSpec(filter);
  const selectedValues = normalized.values ?? [];
  const [search, setSearch] = useState("");
  const [advancedMode, setAdvancedMode] = useState(
    () => facetFilterUsesAdvancedUi(normalized) || (normalized.op ?? "in") !== "in",
  );
  const op = (normalized.op ?? "in") as FacetFilterOp;
  const showAdvanced = column ? supportsAdvancedFacetMode(column) : true;

  const orderedValues = useMemo(
    () => sortFacetValues(field.values, selectedValues),
    [field.values, selectedValues],
  );
  const needle = search.trim().toLowerCase();
  const visibleValues =
    needle === ""
      ? orderedValues
      : orderedValues.filter((item) => {
          const label = displayText(item.label, item.value).toLowerCase();
          return label.includes(needle) || item.value.toLowerCase().includes(needle);
        });
  const showSearch = field.values.length > FACET_SEARCH_THRESHOLD;
  const usesValueList = !advancedMode || op === "in" || op === "equals" || op === "not_equal";
  const usesContainsInput = advancedMode && op === "contains";

  function updateFilter(next: FacetFilterSpec) {
    onChange(normalizeFacetFilterSpec(next));
  }

  return (
    <div className="facet-field-panel">
      {showAdvanced && (
        <div className="facet-field-panel__mode">
          <Button
            type="link"
            size="small"
            disabled={disabled}
            onClick={() => {
              if (advancedMode) {
                setAdvancedMode(false);
                updateFilter({ op: "in", values: selectedValues });
                return;
              }
              setAdvancedMode(true);
            }}
          >
            {displayText(advancedMode ? chrome.facet_basic : chrome.facet_advanced)}
          </Button>
        </div>
      )}
      {advancedMode && (
        <Select
          className="facet-field-panel__op"
          disabled={disabled}
          value={op}
          options={ADVANCED_OPS.map((value) => ({
            value,
            label: facetOpLabel(chrome, value),
          }))}
          onChange={(nextOp: FacetFilterOp) => {
            if (nextOp === "blank" || nextOp === "not_blank") {
              updateFilter({ op: nextOp });
              return;
            }
            updateFilter({ op: nextOp, values: selectedValues });
          }}
        />
      )}
      {usesContainsInput && (
        <Input
          allowClear
          size="small"
          disabled={disabled}
          value={selectedValues[0] ?? ""}
          onChange={(event) => {
            const value = event.target.value.trim();
            updateFilter(value ? { op: "contains", values: [value] } : { op: "contains" });
          }}
        />
      )}
      {!usesContainsInput && usesValueList && op !== "blank" && op !== "not_blank" && (
        <>
          {showSearch && (
            <Input
              allowClear
              size="small"
              className="facet-field-panel__search"
              placeholder={displayText(chrome.facet_search_placeholder)}
              value={search}
              disabled={disabled}
              onChange={(e) => setSearch(e.target.value)}
            />
          )}
          <Checkbox.Group
            className="facet-field-panel__options"
            value={selectedValues}
            disabled={disabled}
            onChange={(values) => updateFilter({ op: advancedMode ? op : "in", values: values.map(String) })}
          >
            {visibleValues.map((item) => (
              <label key={item.value} className="facet-field-panel__option">
                <Checkbox value={item.value} />
                <span className="facet-field-panel__label">
                  {item.value === FACET_UNDEFINED_VALUE
                    ? displayText(chrome.facet_undefined, "(undefined)")
                    : displayText(item.label, item.value)}
                </span>
                <span className="facet-field-panel__count">{item.count}</span>
              </label>
            ))}
          </Checkbox.Group>
        </>
      )}
      {(op === "blank" ||
        op === "not_blank" ||
        selectedValues.length > 0 ||
        usesContainsInput) && (
        <Button type="link" size="small" disabled={disabled} onClick={onClear}>
          {displayText(chrome.facet_clear_field)}
        </Button>
      )}
    </div>
  );
}

type Props = {
  columns: ListColumn[];
  fields: FacetFieldResult[];
  selected: FacetFilters;
  loading?: boolean;
  disabled?: boolean;
  chrome: FacetChrome;
  onChange: (fieldApiName: string, filter: FacetFilterSpec) => void;
  onClearField: (fieldApiName: string) => void;
};

function isFilterActive(filter: FacetFilterSpec | undefined): boolean {
  const normalized = normalizeFacetFilterSpec(filter);
  if (normalized.op === "blank" || normalized.op === "not_blank") {
    return true;
  }
  return Boolean(normalized.preset) || (normalized.values?.length ?? 0) > 0;
}

export function FacetFilterPanel({
  columns,
  fields,
  selected,
  loading,
  disabled,
  chrome,
  onChange,
  onClearField,
}: Props) {
  if (columns.length === 0) {
    return null;
  }

  const fieldByName = new Map(fields.map((field) => [field.field_api_name, field]));

  return (
    <div className="facet-filter-panel">
      {loading && fields.length === 0 ? (
        <Spin size="small" description={displayText(chrome.facet_loading)} />
      ) : (
        <Collapse
          className="sidebar-filter-panel"
          expandIconPlacement="start"
          items={columns.map((column) => {
            const field = fieldByName.get(column.field_api_name) ?? {
              field_api_name: column.field_api_name,
              values: [],
            };
            const filter = selected[column.field_api_name] ?? {};
            const active = isFilterActive(filter);
            return {
              key: column.field_api_name,
              label: (
                <span className="facet-filter-panel__label">
                  {displayText(column.label, column.field_api_name)}
                  {active && <span className="facet-filter-panel__badge">•</span>}
                </span>
              ),
              children: isDateLikeFieldType(column.field_type) ? (
                <DateFieldFilterPanel
                  filter={filter}
                  disabled={disabled}
                  includeTime={column.field_type === "DateTime"}
                  clearLabel={chrome.facet_clear_field}
                  chrome={chrome}
                  onChange={(next) => onChange(column.field_api_name, next)}
                  onClear={() => onClearField(column.field_api_name)}
                />
              ) : isNumberFieldType(column.field_type) ? (
                <NumberFieldFilterPanel
                  filter={filter}
                  disabled={disabled}
                  clearLabel={chrome.facet_clear_field}
                  chrome={chrome}
                  onChange={(next) => onChange(column.field_api_name, next)}
                  onClear={() => onClearField(column.field_api_name)}
                />
              ) : (
                <FacetFieldPanel
                  field={field}
                  column={column}
                  filter={filter}
                  disabled={disabled}
                  chrome={chrome}
                  onChange={(next) => onChange(column.field_api_name, next)}
                  onClear={() => onClearField(column.field_api_name)}
                />
              ),
            };
          })}
        />
      )}
    </div>
  );
}

export function facetSelectionCount(filters: FacetFilters, fieldApiName: string): number {
  const spec = normalizeFacetFilters(filters)[fieldApiName];
  if (!spec) {
    return 0;
  }
  if (spec.op === "blank" || spec.op === "not_blank" || spec.preset) {
    return 1;
  }
  return getFacetFilterValues(filters, fieldApiName).length;
}
