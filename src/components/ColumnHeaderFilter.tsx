import { FilterOutlined } from "@ant-design/icons";
import { Badge, Button, Popover } from "antd";
import type { FacetFieldResult, ListColumn } from "../api/types";
import {
  normalizeFacetFilterSpec,
  type FacetFilterSpec,
  isDateLikeFieldType,
  isNumberFieldType,
} from "../lib/facetFilters";
import { displayText } from "../lib/i18n";
import type { ListChrome } from "../lib/i18n/chromeTypes";
import { DateFieldFilterPanel } from "./DateFieldFilterPanel";
import { FacetFieldPanel } from "./FacetFilterPanel";
import { NumberFieldFilterPanel } from "./NumberFieldFilterPanel";

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

type Props = {
  column: ListColumn;
  field?: FacetFieldResult;
  filter: FacetFilterSpec;
  disabled?: boolean;
  chrome: FacetChrome;
  onChange: (filter: FacetFilterSpec) => void;
};

function isFilterActive(filter: FacetFilterSpec): boolean {
  const normalized = normalizeFacetFilterSpec(filter);
  if (normalized.op === "blank" || normalized.op === "not_blank") {
    return true;
  }
  return Boolean(normalized.preset) || (normalized.values?.length ?? 0) > 0;
}

export function ColumnHeaderFilter({
  column,
  field,
  filter,
  disabled,
  chrome,
  onChange,
}: Props) {
  const active = isFilterActive(filter);
  const content = isDateLikeFieldType(column.field_type) ? (
    <DateFieldFilterPanel
      filter={filter}
      disabled={disabled}
      includeTime={column.field_type === "DateTime"}
      clearLabel={chrome.facet_clear_field}
      chrome={chrome}
      onChange={onChange}
      onClear={() => onChange({})}
    />
  ) : isNumberFieldType(column.field_type) ? (
    <NumberFieldFilterPanel
      filter={filter}
      disabled={disabled}
      clearLabel={chrome.facet_clear_field}
      chrome={chrome}
      onChange={onChange}
      onClear={() => onChange({})}
    />
  ) : (
    <FacetFieldPanel
      field={
        field ?? {
          field_api_name: column.field_api_name,
          values: [],
        }
      }
      column={column}
      filter={filter}
      disabled={disabled}
      chrome={chrome}
      onChange={onChange}
      onClear={() => onChange({})}
    />
  );

  return (
    <Popover
      trigger="click"
      placement="bottomLeft"
      content={<div className="column-header-filter__popover">{content}</div>}
    >
      <Button
        type="text"
        size="small"
        className={`column-header-filter${active ? " column-header-filter--active" : ""}`}
        aria-label={displayText(column.label, column.field_api_name)}
        disabled={disabled}
        onClick={(event) => event.stopPropagation()}
      >
        <Badge dot={active} color="var(--accent)">
          <FilterOutlined />
        </Badge>
      </Button>
    </Popover>
  );
}
