import { Button, InputNumber, Select } from "antd";
import type { DisplayText } from "../api/types";
import {
  normalizeFacetFilterSpec,
  type FacetFilterOp,
  type FacetFilterSpec,
} from "../lib/facetFilters";
import { displayText } from "../lib/i18n";
import type { ListChrome } from "../lib/i18n/chromeTypes";

type NumberFilterChrome = Pick<
  ListChrome,
  | "facet_clear_field"
  | "number_filter_equals"
  | "number_filter_blank"
  | "number_filter_not_blank"
  | "number_filter_value_placeholder"
>;

type Props = {
  filter: FacetFilterSpec;
  disabled?: boolean;
  clearLabel?: DisplayText;
  chrome: NumberFilterChrome;
  onChange: (filter: FacetFilterSpec) => void;
  onClear: () => void;
};

const NUMBER_OPS: FacetFilterOp[] = ["equals", "blank", "not_blank"];

function isActive(spec: FacetFilterSpec): boolean {
  const normalized = normalizeFacetFilterSpec(spec);
  if (normalized.op === "blank" || normalized.op === "not_blank") {
    return true;
  }
  return (normalized.values?.length ?? 0) > 0;
}

export function NumberFieldFilterPanel({
  filter,
  disabled,
  clearLabel,
  chrome,
  onChange,
  onClear,
}: Props) {
  const normalized = normalizeFacetFilterSpec(filter);
  // Backend treats multi-value equality as OR; UI uses a single numeric input (op "in"/"equals").
  const op: FacetFilterOp =
    normalized.op === "blank" || normalized.op === "not_blank"
      ? normalized.op
      : "equals";
  const rawValue = normalized.values?.[0];
  const numericValue =
    rawValue !== undefined && rawValue !== "" && !Number.isNaN(Number(rawValue))
      ? Number(rawValue)
      : null;

  const operatorOptions = NUMBER_OPS.map((value) => ({
    value,
    label: displayText(
      value === "equals"
        ? chrome.number_filter_equals
        : value === "blank"
          ? chrome.number_filter_blank
          : chrome.number_filter_not_blank,
      value,
    ),
  }));

  function updateFilter(next: FacetFilterSpec) {
    onChange(normalizeFacetFilterSpec(next));
  }

  return (
    <div className="number-field-filter-panel">
      <Select
        className="number-field-filter-panel__op"
        disabled={disabled}
        value={op}
        options={operatorOptions}
        onChange={(nextOp: FacetFilterOp) => {
          if (nextOp === "blank" || nextOp === "not_blank") {
            updateFilter({ op: nextOp });
            return;
          }
          updateFilter(
            numericValue !== null ? { op: "in", values: [String(numericValue)] } : { op: "in" },
          );
        }}
      />
      {op === "equals" && (
        <InputNumber
          className="number-field-filter-panel__value"
          disabled={disabled}
          value={numericValue}
          placeholder={displayText(chrome.number_filter_value_placeholder, "Enter a number")}
          style={{ width: "100%" }}
          onChange={(value) => {
            if (value === null || value === undefined) {
              updateFilter({ op: "in" });
              return;
            }
            updateFilter({ op: "in", values: [String(value)] });
          }}
        />
      )}
      {isActive(normalized) ? (
        <Button type="link" size="small" disabled={disabled} onClick={onClear}>
          {displayText(clearLabel, "Clear")}
        </Button>
      ) : null}
    </div>
  );
}
