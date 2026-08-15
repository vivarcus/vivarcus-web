import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Checkbox, DatePicker, Input, InputNumber, Modal, Pagination, Select, Space, Spin, Table } from "antd";
import type { InputRef, TableColumnsType } from "antd";
import { MinusCircleOutlined, PlusOutlined, SearchOutlined, WarningOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type {
  DisplayText,
  ListColumn,
  ListGridPreferences,
  OutboundDependencyCandidate,
  RelatedRowActions,
  RelatedSectionBulkResult,
  RelatedSectionCandidateRow,
  RelatedSectionDescriptor,
  RelatedSectionModel,
} from "../api/types";
import { useUi } from "../context/UiContext";
import {
  dateFieldPlaceholder,
  datePickerInputFormats,
  defaultListChrome,
  defaultPageActionLabels,
  defaultRelatedChrome,
  displayText,
  displayTextTemplate,
  relatedChromeForJoinRelationship,
} from "../lib/i18n";
import { isDateLikeFieldType } from "../lib/facetFilters";
import { relatedSectionRowCount } from "../lib/relatedSectionCount";
import { DateFieldInput } from "../renderers/DateFieldInput";
import { parseDayjsValue } from "../renderers/formUtils";
import { takeRelatedSectionSnapshot, clearRelatedSectionSnapshot } from "../lib/relatedCreate";
import { recordEditHref } from "../lib/recordEditHref";
import { sortStateFromListResponse, toggleListColumnSort } from "../lib/objectListPage";
import { LazyRecordRowActionMenu } from "./record/LazyRecordRowActionMenu";
import { rowHasRecordActions } from "./record/RecordRowActionMenu";
import { DocumentViewerPanel } from "./record/DocumentViewerPanel";
import { WorkflowStartModal } from "./WorkflowStartModal";
import { PreExecutionDialogModal } from "./PreExecutionDialogModal";
import { useRecordLifecycleActions } from "../hooks/useRecordLifecycleActions";
import { filterListRows } from "../lib/filterListRows";
import { isListFilterActive, listFilteredRange, listPageNavigation, listPageRange } from "../lib/listRange";
import { ListPagination } from "./ListPagination";
import { EditColumnsDialog } from "./EditColumnsDialog";
import { ListActionsMenu } from "./ListActionsMenu";
import { RelatedCreateButton } from "./RelatedCreateButton";
import { DataTable } from "./DataTable";

const RELATED_SECTION_PAGE_SIZE = 25;

type Props = {
  vaultId: string;
  label: string;
  descriptor: RelatedSectionDescriptor;
  defaultExpanded?: boolean;
  isOpen?: boolean;
  hideHeader?: boolean;
  viewOnly?: boolean;
  onTotalChange?: (total: number | undefined) => void;
  parentObjectName?: string;
  parentRecordId?: string;
};

function relatedSectionRows(
  section: Pick<RelatedSectionModel, "rows"> | null | undefined,
): RelatedSectionModel["rows"] {
  const rows = section?.rows;
  return Array.isArray(rows) ? rows : [];
}

function resolveRelatedColumns(
  model: RelatedSectionModel | null | undefined,
  descriptor: RelatedSectionDescriptor,
): ListColumn[] {
  if (Array.isArray(model?.columns)) {
    return model.columns;
  }
  if (Array.isArray(descriptor.columns)) {
    return descriptor.columns;
  }
  return [];
}

function resolveRelatedRowActions(
  rowActions: RelatedRowActions | undefined,
  sectionUnlinkAllowed: boolean,
): RelatedRowActions | undefined {
  if (!sectionUnlinkAllowed && !rowActions) {
    return rowActions;
  }
  return {
    ...rowActions,
    unlink_allowed: Boolean(rowActions?.unlink_allowed || sectionUnlinkAllowed),
  };
}

function formatRelatedBulkResult(
  chrome: typeof defaultRelatedChrome,
  result: Pick<RelatedSectionBulkResult, "success_count" | "failure_count" | "failure_rows">,
): string {
  const summary = displayTextTemplate(chrome.bulk_result, {
    success: result.success_count,
    failure: result.failure_count,
  });
  const details = [
    ...new Set((result.failure_rows ?? []).map((row) => row.error.trim()).filter(Boolean)),
  ];
  if (details.length === 0) {
    return summary;
  }
  return `${summary}: ${details.join("; ")}`;
}

const CANDIDATE_PAGE_SIZE = 50;
const CANDIDATE_FILTER_MAX = 10;

type CandidateFilterOption = {
  value: string;
  label: DisplayText;
};

type CandidateFilterableField = {
  field_api_name: string;
  label: DisplayText;
  field_type?: string;
  picklist_name?: string;
  options?: CandidateFilterOption[];
};

type CandidateFilterOp =
  | "contains"
  | "equals"
  | "not_equals"
  | "blank"
  | "not_blank"
  | "between"
  | "after"
  | "before"
  | "last_n"
  | "next_n";

type CandidateFilterRow = {
  key: string;
  field?: string;
  op: CandidateFilterOp;
  value: string;
  valueTo: string;
};

type AppliedCandidateFilter = {
  field: string;
  op: CandidateFilterOp;
  value?: string;
  value_to?: string;
};

let candidateFilterKeySeq = 0;
function nextCandidateFilterKey(): string {
  candidateFilterKeySeq += 1;
  return `cf-${candidateFilterKeySeq}`;
}

function emptyCandidateFilterRow(): CandidateFilterRow {
  return {
    key: nextCandidateFilterKey(),
    field: undefined,
    op: "contains",
    value: "",
    valueTo: "",
  };
}

function defaultCandidateOp(fieldType: string | undefined): CandidateFilterOp {
  if (
    fieldType === "Number" ||
    fieldType === "Currency" ||
    fieldType === "Percent" ||
    fieldType === "Boolean" ||
    fieldType === "Picklist" ||
    isDateLikeFieldType(fieldType)
  ) {
    return "equals";
  }
  return "contains";
}

function candidateOpsForFieldType(fieldType: string | undefined): CandidateFilterOp[] {
  if (isDateLikeFieldType(fieldType)) {
    return ["equals", "between", "after", "before", "last_n", "next_n", "blank", "not_blank"];
  }
  if (isCandidateNumberType(fieldType)) {
    return ["equals", "not_equals", "between", "after", "before", "blank", "not_blank"];
  }
  if (fieldType === "Boolean" || fieldType === "Picklist") {
    return ["equals", "not_equals", "blank", "not_blank"];
  }
  return ["contains", "equals", "not_equals", "blank", "not_blank"];
}

function candidateOpNeedsValue(op: CandidateFilterOp): boolean {
  return op !== "blank" && op !== "not_blank";
}

function collectAppliedFilters(rows: CandidateFilterRow[]): AppliedCandidateFilter[] {
  const out: AppliedCandidateFilter[] = [];
  for (const row of rows) {
    const field = row.field?.trim();
    if (!field) continue;
    const op = row.op;
    if (!candidateOpNeedsValue(op)) {
      out.push({ field, op });
      continue;
    }
    const value = row.value.trim();
    if (!value) continue;
    if (op === "between" && !row.valueTo.trim()) continue;
    if ((op === "last_n" || op === "next_n") && !row.valueTo.trim()) continue;
    out.push({
      field,
      op,
      value,
      value_to: row.valueTo.trim() || undefined,
    });
  }
  return out;
}

const PREFERRED_FILTER_FIELDS = [
  "component_name__v",
  "name__v",
  "component_type__v",
  "label__v",
];

function pickDefaultFilterField(fields: Array<{ field_api_name: string }>): string | undefined {
  for (const preferred of PREFERRED_FILTER_FIELDS) {
    if (fields.some((f) => f.field_api_name === preferred)) {
      return preferred;
    }
  }
  return fields[0]?.field_api_name;
}

function isCandidateNumberType(fieldType: string | undefined): boolean {
  return fieldType === "Number" || fieldType === "Currency" || fieldType === "Percent";
}

function isCandidateChoiceType(fieldType: string | undefined): boolean {
  return fieldType === "Picklist" || fieldType === "Boolean";
}

function candidateOpLabel(
  chrome: typeof defaultRelatedChrome,
  op: CandidateFilterOp,
): string {
  switch (op) {
    case "contains":
      return displayText(chrome.filter_op_contains);
    case "equals":
      return displayText(chrome.filter_op_equals);
    case "not_equals":
      return displayText(chrome.filter_op_not_equals);
    case "blank":
      return displayText(chrome.filter_op_blank);
    case "not_blank":
      return displayText(chrome.filter_op_not_blank);
    case "between":
      return displayText(chrome.filter_op_between);
    case "after":
      return displayText(chrome.filter_op_after);
    case "before":
      return displayText(chrome.filter_op_before);
    case "last_n":
      return displayText(chrome.filter_op_last_n);
    case "next_n":
      return displayText(chrome.filter_op_next_n);
    default:
      return op;
  }
}

function CandidateFilterValueControl({
  fieldMeta,
  op,
  value,
  valueTo,
  chrome,
  loading,
  showSearchButton,
  inputRef,
  onValueChange,
  onValueToChange,
  onCommit,
}: {
  fieldMeta?: CandidateFilterableField;
  op: CandidateFilterOp;
  value: string;
  valueTo: string;
  chrome: typeof defaultRelatedChrome;
  loading: boolean;
  showSearchButton: boolean;
  inputRef?: (node: InputRef | null) => void;
  onValueChange: (value: string) => void;
  onValueToChange: (value: string) => void;
  onCommit: (value: string, valueTo?: string) => void;
}) {
  const { displayContext } = useUi();
  const fieldType = fieldMeta?.field_type;
  const includeTime = fieldType === "DateTime";
  const choiceOptions = fieldMeta?.options ?? [];
  const useChoiceSelect =
    (isCandidateChoiceType(fieldType) || choiceOptions.length > 0) &&
    (op === "equals" || op === "not_equals" || op === "contains");

  if (!candidateOpNeedsValue(op)) {
    return null;
  }

  if (op === "last_n" || op === "next_n") {
    const numeric = value.trim() === "" ? null : Number(value);
    const unitOptions = [
      { value: "days", label: displayText(chrome.filter_unit_days) },
      { value: "weeks", label: displayText(chrome.filter_unit_weeks) },
      { value: "months", label: displayText(chrome.filter_unit_months) },
      { value: "quarters", label: displayText(chrome.filter_unit_quarters) },
      { value: "years", label: displayText(chrome.filter_unit_years) },
    ];
    return (
      <Space.Compact className="related-section__add-existing-filter-value-wrap">
        <InputNumber
          className="related-section__add-existing-filter-value"
          min={1}
          value={Number.isFinite(numeric) ? numeric : null}
          placeholder={displayText(chrome.filter_value_placeholder)}
          onChange={(next) => onValueChange(next == null ? "" : String(next))}
          onPressEnter={() => onCommit(value, valueTo || "days")}
        />
        <Select
          className="related-section__add-existing-filter-unit"
          options={unitOptions}
          value={valueTo || "days"}
          onChange={(next) => onCommit(value, typeof next === "string" ? next : "days")}
        />
      </Space.Compact>
    );
  }

  if (op === "between" && isDateLikeFieldType(fieldType)) {
    const start = value ? dayjs(value) : null;
    const end = valueTo ? dayjs(valueTo) : null;
    return (
      <DatePicker.RangePicker
        className="related-section__add-existing-filter-value"
        value={
          start?.isValid() && end?.isValid()
            ? [start, end]
            : null
        }
        allowClear
        showTime={includeTime ? { format: "HH:mm:ss" } : false}
        format={datePickerInputFormats(displayContext, includeTime)}
        onChange={(next) => {
          const [a, b] = next ?? [];
          if (!a?.isValid() || !b?.isValid()) {
            onCommit("", "");
            return;
          }
          const fmt = includeTime ? "YYYY-MM-DDTHH:mm:ss" : "YYYY-MM-DD";
          onCommit(a.format(fmt), b.format(fmt));
        }}
      />
    );
  }

  if (op === "between" && isCandidateNumberType(fieldType)) {
    const a = value.trim() === "" ? null : Number(value);
    const b = valueTo.trim() === "" ? null : Number(valueTo);
    return (
      <Space.Compact className="related-section__add-existing-filter-value-wrap">
        <InputNumber
          className="related-section__add-existing-filter-value"
          value={Number.isFinite(a) ? a : null}
          placeholder={displayText(chrome.filter_value_placeholder)}
          onChange={(next) => onValueChange(next == null ? "" : String(next))}
          onPressEnter={() => onCommit(value, valueTo)}
        />
        <InputNumber
          className="related-section__add-existing-filter-value"
          value={Number.isFinite(b) ? b : null}
          placeholder={displayText(chrome.filter_value_placeholder)}
          onChange={(next) => onValueToChange(next == null ? "" : String(next))}
          onPressEnter={() => onCommit(value, valueTo)}
        />
      </Space.Compact>
    );
  }

  if (useChoiceSelect) {
    const options = choiceOptions.map((opt) => ({
      value: opt.value,
      label: displayText(opt.label) || opt.value,
    }));
    return (
      <Select
        className="related-section__add-existing-filter-value"
        showSearch
        allowClear
        placeholder={displayText(chrome.filter_value_placeholder)}
        options={options}
        value={value || undefined}
        optionFilterProp="label"
        onChange={(next) => onCommit(typeof next === "string" ? next : "")}
      />
    );
  }

  if (isDateLikeFieldType(fieldType)) {
    if (includeTime) {
      const parsed = parseDayjsValue(value, displayContext);
      return (
        <DatePicker
          className="related-section__add-existing-filter-value"
          value={parsed}
          allowClear
          showTime={{ format: "HH:mm:ss" }}
          placeholder={dateFieldPlaceholder(displayContext, true)}
          format={datePickerInputFormats(displayContext, true)}
          onChange={(next: Dayjs | null) => {
            if (!next?.isValid()) {
              onCommit("");
              return;
            }
            onCommit(next.format("YYYY-MM-DDTHH:mm:ss"));
          }}
        />
      );
    }
    return (
      <DateFieldInput
        className="related-section__add-existing-filter-value"
        value={value}
        allowClear
        displayContext={displayContext}
        placeholder={dateFieldPlaceholder(displayContext, false)}
        onChange={(iso) => onCommit(iso ?? "")}
      />
    );
  }

  if (isCandidateNumberType(fieldType)) {
    const numeric = value.trim() === "" ? null : Number(value);
    return (
      <InputNumber
        className="related-section__add-existing-filter-value"
        value={Number.isFinite(numeric) ? numeric : null}
        placeholder={displayText(chrome.filter_value_placeholder)}
        onChange={(next) => onValueChange(next == null ? "" : String(next))}
        onPressEnter={() => onCommit(value)}
      />
    );
  }

  return (
    <Input.Search
      className="related-section__add-existing-filter-value"
      ref={inputRef}
      value={value}
      placeholder={displayText(chrome.filter_value_placeholder)}
      allowClear
      enterButton={showSearchButton}
      loading={showSearchButton ? loading : false}
      onChange={(e) => onValueChange(e.target.value)}
      onSearch={(next) => onCommit(next)}
    />
  );
}

function RelatedAddExistingDialog({
  vaultId,
  sectionToken,
  chrome,
  onLinked,
  onClose,
  onError,
}: {
  vaultId: string;
  sectionToken: string;
  chrome: typeof defaultRelatedChrome;
  onLinked: (section: RelatedSectionModel) => void;
  onClose: () => void;
  onError: (message: string) => void;
}) {
  const [filterRows, setFilterRows] = useState<CandidateFilterRow[]>(() => [
    emptyCandidateFilterRow(),
  ]);
  const [appliedFilters, setAppliedFilters] = useState<AppliedCandidateFilter[]>([]);
  const [page, setPage] = useState(1);
  const [columns, setColumns] = useState<ListColumn[]>([]);
  const [rows, setRows] = useState<RelatedSectionCandidateRow[]>([]);
  const [filterableFields, setFilterableFields] = useState<CandidateFilterableField[]>([]);
  const [objectApiName, setObjectApiName] = useState<string | undefined>();
  const [objectLabel, setObjectLabel] = useState<string>("");
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(CANDIDATE_PAGE_SIZE);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const valueInputRefs = useRef<Map<string, InputRef>>(new Map());
  const defaultFieldApplied = useRef(false);

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const runSearch = useCallback(async () => {
    setLoading(true);
    onErrorRef.current("");
    try {
      const pageOffset = (page - 1) * CANDIDATE_PAGE_SIZE;
      const res = await api.searchRelatedCandidates(vaultId, {
        section_context_token: sectionToken,
        filters: appliedFilters,
        page_size: CANDIDATE_PAGE_SIZE,
        page_offset: pageOffset,
      });
      setColumns(Array.isArray(res.columns) ? res.columns : []);
      setRows(Array.isArray(res.rows) ? res.rows : []);
      setFilterableFields(Array.isArray(res.filterable_fields) ? res.filterable_fields : []);
      setObjectApiName(res.remote_object_api_name);
      setObjectLabel(displayText(res.remote_object_label) || res.remote_object_api_name || "");
      setTotal(typeof res.total === "number" ? res.total : res.rows.length);
      setPageSize(res.page_size && res.page_size > 0 ? res.page_size : CANDIDATE_PAGE_SIZE);
      if (res.rows.length === 1 && page === 1) {
        setSelectedIds([res.rows[0].record_id]);
      }
    } catch (err) {
      onErrorRef.current(
        err instanceof Error ? err.message : displayText(defaultRelatedChrome.search_failed),
      );
      setColumns([]);
      setRows([]);
      setSelectedIds([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [vaultId, sectionToken, page, appliedFilters]);

  useEffect(() => {
    void runSearch();
  }, [runSearch]);

  useEffect(() => {
    if (defaultFieldApplied.current || filterableFields.length === 0) return;
    const defaultField = pickDefaultFilterField(filterableFields);
    if (!defaultField) return;
    defaultFieldApplied.current = true;
    const fieldMeta = filterableFields.find((f) => f.field_api_name === defaultField);
    const defaultOp = defaultCandidateOp(fieldMeta?.field_type);
    let focusKey: string | undefined;
    setFilterRows((prev) => {
      if (prev.length !== 1 || prev[0]?.field) return prev;
      focusKey = prev[0].key;
      return [{ ...prev[0], field: defaultField, op: defaultOp, value: "", valueTo: "days" }];
    });
    if (focusKey) {
      const key = focusKey;
      queueMicrotask(() => valueInputRefs.current.get(key)?.focus?.({ cursor: "end" }));
    }
  }, [filterableFields]);

  function applyFilter(nextRows: CandidateFilterRow[] = filterRows) {
    setSelectedIds([]);
    setPage(1);
    setAppliedFilters(collectAppliedFilters(nextRows));
  }

  function updateFilterRow(key: string, patch: Partial<CandidateFilterRow>) {
    setFilterRows((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  function commitFilterValue(key: string, value: string, valueTo?: string) {
    const nextRows = filterRows.map((row) =>
      row.key === key
        ? {
            ...row,
            value,
            valueTo: valueTo !== undefined ? valueTo : row.valueTo,
          }
        : row,
    );
    setFilterRows(nextRows);
    applyFilter(nextRows);
  }

  function selectFilterField(key: string, field: string | undefined) {
    const fieldMeta = field
      ? filterableFields.find((f) => f.field_api_name === field)
      : undefined;
    const op = defaultCandidateOp(fieldMeta?.field_type);
    updateFilterRow(key, {
      field,
      op,
      value: "",
      valueTo: op === "last_n" || op === "next_n" ? "days" : "",
    });
    if (field && candidateOpNeedsValue(op)) {
      queueMicrotask(() => valueInputRefs.current.get(key)?.focus?.({ cursor: "end" }));
    }
  }

  function selectFilterOp(key: string, op: CandidateFilterOp) {
    const row = filterRows.find((r) => r.key === key);
    const nextValueTo = op === "last_n" || op === "next_n" ? row?.valueTo || "days" : "";
    const nextRows = filterRows.map((r) =>
      r.key === key
        ? {
            ...r,
            op,
            value: "",
            valueTo: nextValueTo,
          }
        : r,
    );
    setFilterRows(nextRows);
    if (!candidateOpNeedsValue(op)) {
      applyFilter(nextRows);
      return;
    }
    queueMicrotask(() => valueInputRefs.current.get(key)?.focus?.({ cursor: "end" }));
  }

  function addFilterRow() {
    const defaultField = pickDefaultFilterField(filterableFields);
    const fieldMeta = defaultField
      ? filterableFields.find((f) => f.field_api_name === defaultField)
      : undefined;
    const row: CandidateFilterRow = {
      ...emptyCandidateFilterRow(),
      field: defaultField,
      op: defaultCandidateOp(fieldMeta?.field_type),
    };
    setFilterRows((prev) => (prev.length >= CANDIDATE_FILTER_MAX ? prev : [...prev, row]));
    queueMicrotask(() => valueInputRefs.current.get(row.key)?.focus?.({ cursor: "end" }));
  }

  function removeFilterRow(key: string) {
    setFilterRows((prev) => {
      let next: CandidateFilterRow[];
      if (prev.length <= 1) {
        const defaultField = pickDefaultFilterField(filterableFields);
        const fieldMeta = defaultField
          ? filterableFields.find((f) => f.field_api_name === defaultField)
          : undefined;
        next = [
          {
            ...emptyCandidateFilterRow(),
            field: defaultField,
            op: defaultCandidateOp(fieldMeta?.field_type),
          },
        ];
      } else {
        next = prev.filter((row) => row.key !== key);
      }
      queueMicrotask(() => applyFilter(next));
      return next;
    });
  }

  async function submitLink() {
    if (selectedIds.length === 0) return;
    setLinking(true);
    onError("");
    try {
      const res = await api.bulkLinkRelatedSection(vaultId, {
        section_context_token: sectionToken,
        target_record_ids: selectedIds,
      });
      onLinked(res.section);
      onClose();
      if (res.failure_count > 0) {
        onError(formatRelatedBulkResult(chrome, res));
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : displayText(chrome.link_failed));
    } finally {
      setLinking(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(Math.max(total, 0) / pageSize));
  const pageRange = listPageRange(page - 1, pageSize, rows.length, total);
  const rangeText = displayTextTemplate(chrome.range_text, {
    start: String(pageRange.start),
    end: String(pageRange.end),
    total: String(pageRange.total),
  });
  const title = displayTextTemplate(chrome.search_title, {
    object: objectLabel || displayText(chrome.add_existing),
  });
  const filterOptions = filterableFields.map((field) => ({
    value: field.field_api_name,
    label: displayText(field.label) || field.field_api_name,
  }));
  const filterFieldByName = useMemo(() => {
    const map = new Map<string, CandidateFilterableField>();
    for (const field of filterableFields) {
      map.set(field.field_api_name, field);
    }
    return map;
  }, [filterableFields]);

  return (
    <Modal
      open
      className="related-section__add-existing-modal"
      title={title}
      width={960}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          {displayText(chrome.cancel)}
        </Button>,
        <Button
          key="link"
          type="primary"
          loading={linking}
          disabled={selectedIds.length === 0}
          onClick={() => void submitLink()}
        >
          {displayText(chrome.link_selected)}
        </Button>,
      ]}
    >
      <div className="related-section__add-existing-body">
        <div className="related-section__add-existing-filters">
          <span className="related-section__add-existing-filters-label">
            {displayText(chrome.filter_label)}
          </span>
          <div className="related-section__add-existing-filter-rows">
            {filterRows.map((row, index) => {
              const isLast = index === filterRows.length - 1;
              const fieldMeta = row.field ? filterFieldByName.get(row.field) : undefined;
              const opOptions = candidateOpsForFieldType(fieldMeta?.field_type).map((op) => ({
                value: op,
                label: candidateOpLabel(chrome, op),
              }));
              const needsValue = candidateOpNeedsValue(row.op);
              const needsExternalSearch =
                isLast &&
                needsValue &&
                (isCandidateNumberType(fieldMeta?.field_type) ||
                  row.op === "last_n" ||
                  row.op === "next_n" ||
                  (row.op === "between" && isCandidateNumberType(fieldMeta?.field_type)));
              return (
                <div key={row.key} className="related-section__add-existing-filter-row">
                  <Space.Compact className="related-section__add-existing-filter-compact">
                    <Select
                      className="related-section__add-existing-filter-field"
                      showSearch
                      allowClear
                      placeholder={displayText(chrome.filter_field_placeholder)}
                      options={filterOptions}
                      value={row.field}
                      optionFilterProp="label"
                      popupMatchSelectWidth={false}
                      onChange={(value) => selectFilterField(row.key, value)}
                    />
                    <Select
                      className="related-section__add-existing-filter-op"
                      placeholder={displayText(chrome.filter_op_placeholder)}
                      options={opOptions}
                      value={row.op}
                      popupMatchSelectWidth={false}
                      onChange={(value) => selectFilterOp(row.key, value as CandidateFilterOp)}
                    />
                    {needsValue ? (
                      <CandidateFilterValueControl
                        fieldMeta={fieldMeta}
                        op={row.op}
                        value={row.value}
                        valueTo={row.valueTo}
                        chrome={chrome}
                        loading={loading}
                        showSearchButton={isLast && !needsExternalSearch}
                        inputRef={(node) => {
                          if (node) valueInputRefs.current.set(row.key, node);
                          else valueInputRefs.current.delete(row.key);
                        }}
                        onValueChange={(value) => updateFilterRow(row.key, { value })}
                        onValueToChange={(valueTo) => updateFilterRow(row.key, { valueTo })}
                        onCommit={(value, valueTo) => commitFilterValue(row.key, value, valueTo)}
                      />
                    ) : null}
                    {needsExternalSearch ? (
                      <Button
                        type="primary"
                        icon={<SearchOutlined />}
                        loading={loading}
                        onClick={() => commitFilterValue(row.key, row.value, row.valueTo)}
                      />
                    ) : null}
                  </Space.Compact>
                  {filterRows.length > 1 ? (
                    <Button
                      type="text"
                      className="related-section__add-existing-filter-remove"
                      icon={<MinusCircleOutlined />}
                      aria-label={displayText(chrome.remove_filter)}
                      onClick={() => removeFilterRow(row.key)}
                    />
                  ) : null}
                </div>
              );
            })}
            <div className="related-section__add-existing-filter-actions">
              <Button
                type="link"
                className="related-section__add-existing-filter-add"
                icon={<PlusOutlined />}
                disabled={filterRows.length >= CANDIDATE_FILTER_MAX}
                onClick={addFilterRow}
              >
                {displayText(chrome.add_filter)}
              </Button>
            </div>
          </div>
        </div>
        <div className="related-section__add-existing-toolbar">
          <ListPagination
            rangeLabel={rangeText}
            currentPage={page}
            totalPages={totalPages}
            hasPrevious={page > 1}
            hasNext={page < totalPages && rows.length > 0}
            loading={loading}
            previousAria={displayText(defaultListChrome.previous_page)}
            nextAria={displayText(defaultListChrome.next_page)}
            pageInputAria={displayText(defaultListChrome.page_input_label)}
            onPrevious={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => p + 1)}
            onGoToPage={(target) => setPage(Math.max(1, Math.min(totalPages, target)))}
          />
        </div>
        <div className="related-section__add-existing-table">
          <DataTable
            columns={columns}
            records={rows}
            vaultId={vaultId}
            objectApiName={objectApiName}
            selectable
            selectedRowKeys={selectedIds}
            onSelectionChange={setSelectedIds}
            loading={loading}
            emptyText={chrome.no_candidates}
          />
        </div>
      </div>
    </Modal>
  );
}

export function RelatedObjectSection({
  vaultId,
  label,
  descriptor,
  defaultExpanded = false,
  isOpen,
  hideHeader = false,
  viewOnly = false,
  onTotalChange,
  parentObjectName,
  parentRecordId,
}: Props) {
  const navigate = useNavigate();
  const { shell } = useUi();
  const cfg = shell.cfg_packaging;
  const controlled = isOpen !== undefined;
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [model, setModel] = useState<RelatedSectionModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAddExisting, setShowAddExisting] = useState(false);
  const [showDependencies, setShowDependencies] = useState(false);
  const [depsLoading, setDepsLoading] = useState(false);
  const [depsAdding, setDepsAdding] = useState(false);
  const [depsWarning, setDepsWarning] = useState(false);
  const [depsItems, setDepsItems] = useState<OutboundDependencyCandidate[]>([]);
  const [depsSelected, setDepsSelected] = useState<string[]>([]);
  const [depsError, setDepsError] = useState<string | null>(null);
  const [depsPage, setDepsPage] = useState(1);
  const [filter, setFilter] = useState("");
  const canViewAddDependencies =
    !viewOnly &&
    parentObjectName === "outbound_package__v" &&
    Boolean(parentRecordId) &&
    descriptor.target_object_api_name === "package_component__v";

  const depsPageSize = 25;
  const dependencyDialogColumns: TableColumnsType<OutboundDependencyCandidate> = useMemo(
    () => [
      {
        title: displayText(cfg.column_name),
        key: "name",
        width: 160,
        ellipsis: true,
        render: (_: unknown, row) => row.component_label || row.component_name || "",
      },
      {
        title: displayText(cfg.column_component_name),
        dataIndex: "component_name",
        width: 180,
        ellipsis: true,
      },
      {
        title: displayText(cfg.column_component_type),
        dataIndex: "component_type",
        width: 120,
        ellipsis: true,
      },
      {
        title: displayText(cfg.column_subcomponent_name),
        key: "sub_component_name",
        width: 150,
        ellipsis: true,
        render: () => "",
      },
      {
        title: displayText(cfg.column_subcomponent_type),
        key: "sub_component_type",
        width: 120,
        ellipsis: true,
        render: () => "",
      },
      {
        title: displayText(cfg.column_referenced_by_name),
        key: "referenced_by",
        ellipsis: true,
        render: (_: unknown, row) => row.source_component_name || row.source_component_label || "",
      },
    ],
    [cfg],
  );

  async function openDependencies() {
    if (!parentRecordId) return;
    setShowDependencies(true);
    setDepsLoading(true);
    setDepsError(null);
    setDepsSelected([]);
    setDepsPage(1);
    try {
      const res = await api.listOutboundPackageDependencies(vaultId, parentRecordId);
      setDepsItems(res.items ?? []);
      setDepsWarning(Boolean(res.target_vault_warning));
    } catch (err) {
      setDepsItems([]);
      setDepsError(
        err instanceof Error ? err.message : displayText(cfg.view_add_dependencies_failed),
      );
    } finally {
      setDepsLoading(false);
    }
  }

  async function addSelectedDependencies() {
    if (!parentRecordId) return;
    if (depsSelected.length === 0) {
      setShowDependencies(false);
      return;
    }
    setDepsAdding(true);
    setDepsError(null);
    try {
      await api.addOutboundPackageDependencies(vaultId, parentRecordId, depsSelected);
      setShowDependencies(false);
      await loadRef.current?.(pageTokenRef.current);
    } catch (err) {
      setDepsError(
        err instanceof Error ? err.message : displayText(cfg.view_add_dependencies_failed),
      );
    } finally {
      setDepsAdding(false);
    }
  }
  const [debouncedFilter, setDebouncedFilter] = useState("");
  const [sortBy, setSortBy] = useState<string | undefined>();
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectingAll, setSelectingAll] = useState(false);
  const [bulkRemoving, setBulkRemoving] = useState(false);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  const [editColumnsOpen, setEditColumnsOpen] = useState(false);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const columnWidthSaveTimerRef = useRef<number | null>(null);
  const [pageToken, setPageToken] = useState<string | undefined>();
  const [pageHistory, setPageHistory] = useState<string[]>([]);
  const loadRef = useRef<((token?: string) => Promise<void>) | null>(null);
  const {
    lifecyclePending,
    workflowDialogAction,
    preExecutionDialog,
    preExecutionActionLabel,
    preExecutionActionName,
    preExecutionActionKind,
    dialogTarget,
    workflowFieldValues,
    workflowParticipantValues,
    workflowDateValues,
    preExecutionInputValues,
    setWorkflowFieldValues,
    setWorkflowParticipantValues,
    setWorkflowDateValues,
    setPreExecutionInputValues,
    handleRowLifecycleAction,
    handleRowSdkAction,
    documentUploadRequest,
    clearDocumentUploadRequest,
    completeDocumentUpload,
    confirmWorkflowDialog,
    confirmPreExecutionDialog,
    cancelActionDialog,
    isRowLifecycleBusy,
  } = useRecordLifecycleActions({
    vaultId,
    actionFailedLabel: displayText(defaultRelatedChrome.remove_failed),
    onReload: async () => {
      await loadRef.current?.(pageTokenRef.current);
    },
    setError,
    onAfterSuccess: async () => {
      await loadRef.current?.(pageTokenRef.current);
    },
  });
  const useModalCreate = descriptor.modal_create_record;
  const onTotalChangeRef = useRef(onTotalChange);
  onTotalChangeRef.current = onTotalChange;
  const loadGenerationRef = useRef(0);
  const countLoadedForRef = useRef<string | null>(null);
  const pageTokenRef = useRef<string | undefined>();
  pageTokenRef.current = pageToken;
  const listQueryRef = useRef({ sortBy, sortDir, debouncedFilter });
  const showBody = controlled ? isOpen : expanded;

  const sectionCommands = viewOnly
    ? {
        add_existing_allowed: false,
        unlink_allowed: false,
        bulk_unlink_allowed: false,
      }
    : (model?.section_commands ??
      descriptor.section_commands ?? {
        add_existing_allowed: false,
        unlink_allowed: false,
        bulk_unlink_allowed: false,
      });
  const joinRelationship = sectionCommands.add_existing_allowed;
  const chrome = relatedChromeForJoinRelationship(
    model?.chrome ?? defaultRelatedChrome,
    joinRelationship,
  );
  const detailObjectApiName =
    model?.remote_object_api_name ??
    descriptor.remote_object_api_name ??
    descriptor.target_object_api_name;
  const selectionEnabled =
    !viewOnly &&
    Boolean(model?.selection_commands?.enabled && sectionCommands.bulk_unlink_allowed);

  const load = useCallback(
    async (requestPageToken?: string) => {
      const generation = ++loadGenerationRef.current;
      setLoading(true);
      setError(null);
      const requestSortBy = sortBy;
      try {
        const data = await api.loadRelatedSection(vaultId, {
          section_context_token: descriptor.section_context_token,
          page_size: RELATED_SECTION_PAGE_SIZE,
          page_token: requestPageToken,
          sort_by: requestSortBy,
          sort_dir: requestSortBy ? sortDir : undefined,
          filter: debouncedFilter.trim() || undefined,
        });
        if (generation !== loadGenerationRef.current) {
          return;
        }
        setModel((prev) => {
          if (
            !debouncedFilter.trim() &&
            relatedSectionRows(data).length === 0 &&
            relatedSectionRows(prev).length > 0
          ) {
            return prev;
          }
          if (relatedSectionRows(data).length > 0) {
            clearRelatedSectionSnapshot(descriptor.section_context_token);
          }
          return data;
        });
        const nextSort = sortStateFromListResponse({ sortBy: requestSortBy }, data.list_controls);
        setSortBy(nextSort.sortBy);
        setSortDir(nextSort.sortDir);
        onTotalChangeRef.current?.(relatedSectionRowCount(data));
      } catch (err) {
        if (generation !== loadGenerationRef.current) {
          return;
        }
        setError(
          err instanceof Error ? err.message : displayText(defaultRelatedChrome.load_failed),
        );
        onTotalChangeRef.current?.(undefined);
      } finally {
        if (generation === loadGenerationRef.current) {
          setLoading(false);
        }
      }
    },
    [vaultId, descriptor.section_context_token, sortBy, sortDir, debouncedFilter],
  );

  loadRef.current = load;

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedFilter(filter), 300);
    return () => window.clearTimeout(timer);
  }, [filter]);

  useEffect(() => {
    loadGenerationRef.current += 1;
    setModel(null);
    setFilter("");
    setDebouncedFilter("");
    setSortBy(undefined);
    setSortDir("asc");
    setSelectedIds([]);
    setPageToken(undefined);
    setPageHistory([]);
    setError(null);
    countLoadedForRef.current = null;
    const seed = takeRelatedSectionSnapshot(descriptor.section_context_token);
    if (seed) {
      setModel(seed);
      onTotalChangeRef.current?.(relatedSectionRowCount(seed));
    }
  }, [descriptor.section_context_token]);

  useEffect(() => {
    if (!showBody) {
      return;
    }
    const prev = listQueryRef.current;
    const queryChanged =
      prev.sortBy !== sortBy ||
      prev.sortDir !== sortDir ||
      prev.debouncedFilter !== debouncedFilter;
    listQueryRef.current = { sortBy, sortDir, debouncedFilter };
    if (queryChanged) {
      if (pageToken !== undefined || pageHistory.length > 0) {
        setPageHistory([]);
        setPageToken(undefined);
      }
      void loadRef.current?.(undefined);
      return;
    }
    void loadRef.current?.(pageToken);
  }, [showBody, pageToken, pageHistory.length, sortBy, sortDir, debouncedFilter]);

  // Collapsed sections never enter the row-load path above, so the section nav
  // would show no count. Use count_only so the nav reflects the real total without
  // the full row/column/action pipeline; once expanded, the effect above loads the first page.
  useEffect(() => {
    if (showBody || !onTotalChangeRef.current) {
      return;
    }
    const token = descriptor.section_context_token;
    if (countLoadedForRef.current === token) {
      return;
    }
    countLoadedForRef.current = token;
    let cancelled = false;
    void api
      .loadRelatedSection(vaultId, { section_context_token: token, count_only: true })
      .then((data) => {
        if (!cancelled) {
          onTotalChangeRef.current?.(relatedSectionRowCount(data));
        }
      })
      .catch(() => {
        countLoadedForRef.current = null;
      });
    return () => {
      cancelled = true;
    };
  }, [showBody, vaultId, descriptor.section_context_token]);

  useEffect(() => {
    setSelectedIds([]);
  }, [sortBy, sortDir, debouncedFilter, pageToken]);

  useEffect(() => {
    setColumnWidths(model?.grid_preferences?.column_widths ?? {});
  }, [descriptor.section_context_token]);

  useEffect(
    () => () => {
      if (columnWidthSaveTimerRef.current != null) {
        window.clearTimeout(columnWidthSaveTimerRef.current);
      }
    },
    [],
  );

  function resetPagination() {
    setPageHistory([]);
    setPageToken(undefined);
  }

  function goNextPage() {
    if (!model?.next_page_token) return;
    setPageHistory((prev) => [...prev, pageToken ?? ""]);
    setPageToken(model.next_page_token);
  }

  function goPreviousPage() {
    if (pageHistory.length === 0) return;
    const history = [...pageHistory];
    const previousToken = history.pop();
    setPageHistory(history);
    setPageToken(previousToken || undefined);
  }

  function goToPage(targetPage: number) {
    if (!model) return;
    const { currentPage, totalPages } = listPageNavigation(
      pageHistory.length,
      RELATED_SECTION_PAGE_SIZE,
      model.total,
    );
    let target = Math.max(1, Math.trunc(targetPage));
    if (totalPages != null) {
      target = Math.min(totalPages, target);
    }
    if (target === currentPage) return;

    if (target < currentPage) {
      const token = target === 1 ? undefined : pageHistory[target - 1];
      const newHistory = target === 1 ? [] : pageHistory.slice(0, target - 1);
      setPageHistory(newHistory);
      setPageToken(token);
      return;
    }

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        let history = [...pageHistory];
        let token: string | undefined = pageToken;
        let page = currentPage;
        let data = model;
        while (page < target) {
          const next = data.next_page_token;
          if (!next) break;
          history = [...history, token ?? ""];
          token = next;
          data = await api.loadRelatedSection(vaultId, {
            section_context_token: descriptor.section_context_token,
            page_size: RELATED_SECTION_PAGE_SIZE,
            page_token: token,
            sort_by: sortBy,
            sort_dir: sortBy ? sortDir : undefined,
            filter: debouncedFilter.trim() || undefined,
          });
          page += 1;
        }
        setModel(data);
        setPageHistory(history);
        setPageToken(token);
        const nextSort = sortStateFromListResponse({ sortBy }, data.list_controls);
        setSortBy(nextSort.sortBy);
        setSortDir(nextSort.sortDir);
        onTotalChangeRef.current?.(relatedSectionRowCount(data));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : displayText(defaultRelatedChrome.load_failed),
        );
      } finally {
        setLoading(false);
      }
    })();
  }

  async function toggle() {
    if (controlled) return;
    setExpanded((prev) => !prev);
  }

  function handleCreateSuccess(section: RelatedSectionModel) {
    resetPagination();
    setModel(section);
    onTotalChangeRef.current?.(relatedSectionRowCount(section));
  }

  function applySectionMutation(section: RelatedSectionModel) {
    resetPagination();
    setModel(section);
    onTotalChangeRef.current?.(relatedSectionRowCount(section));
  }

  function removeRelationship(recordId: string) {
    Modal.confirm({
      title: displayText(chrome.remove_relationship),
      content: displayText(chrome.remove_confirm),
      okText: displayText(chrome.remove_relationship),
      cancelText: displayText(chrome.cancel),
      okButtonProps: { danger: true },
      onOk: async () => {
        setRemovingId(recordId);
        setError(null);
        try {
          const res = await api.unlinkRelatedSection(vaultId, {
            section_context_token: descriptor.section_context_token,
            target_record_id: recordId,
          });
          applySectionMutation(res.section);
          setSelectedIds((prev) => prev.filter((id) => id !== recordId));
        } catch (err) {
          setError(err instanceof Error ? err.message : displayText(chrome.remove_failed));
          throw err;
        } finally {
          setRemovingId(null);
        }
      },
    });
  }

  async function handleSelectAll() {
    setSelectingAll(true);
    setError(null);
    try {
      const res = await api.resolveRelatedSelection(vaultId, {
        section_context_token: descriptor.section_context_token,
        sort_by: sortBy,
        sort_dir: sortBy ? sortDir : undefined,
        filter: debouncedFilter.trim() || undefined,
      });
      setSelectedIds(res.record_ids);
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(chrome.load_failed));
    } finally {
      setSelectingAll(false);
    }
  }

  function handleUnselectAll() {
    setSelectedIds([]);
  }

  function handleBulkRemove() {
    if (selectedIds.length === 0) return;
    Modal.confirm({
      title: displayText(chrome.bulk_remove),
      content: displayTextTemplate(chrome.bulk_remove_confirm, { count: selectedIds.length }),
      okText: displayText(chrome.bulk_remove),
      cancelText: displayText(chrome.cancel),
      okButtonProps: { danger: true },
      onOk: async () => {
        setBulkRemoving(true);
        setError(null);
        try {
          const res = await api.bulkUnlinkRelatedSection(vaultId, {
            section_context_token: descriptor.section_context_token,
            target_record_ids: selectedIds,
          });
          applySectionMutation(res.section);
          setSelectedIds([]);
          if (res.failure_count > 0) {
            setError(formatRelatedBulkResult(chrome, res));
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : displayText(chrome.remove_failed));
          throw err;
        } finally {
          setBulkRemoving(false);
        }
      },
    });
  }

  function deleteRelatedRecord(recordId: string, actions?: RelatedRowActions) {
    const objectName = actions?.target_object_api_name || detailObjectApiName;
    const targetRecordId = actions?.target_record_id?.trim() || recordId;
    if (!actions?.action_guard) return;
    Modal.confirm({
      title: displayText(defaultPageActionLabels.delete),
      content: displayText(defaultPageActionLabels.delete_confirm),
      okText: displayText(defaultPageActionLabels.delete),
      cancelText: displayText(chrome.cancel),
      okButtonProps: { danger: true },
      onOk: async () => {
        setDeletingRecordId(recordId);
        setError(null);
        try {
          await api.deleteRecord(vaultId, objectName, targetRecordId);
          setSelectedIds((prev) => prev.filter((id) => id !== recordId));
          resetPagination();
          await load(undefined);
        } catch (err) {
          setError(err instanceof Error ? err.message : displayText(chrome.remove_failed));
          throw err;
        } finally {
          setDeletingRecordId(null);
        }
      },
    });
  }

  function openSectionInTab() {
    const show = sectionCommands.show_in_tab;
    if (!show?.tab_api_name) return;
    const params = new URLSearchParams();
    if (show.filter_field && show.filter_value) {
      params.set("filter_field", show.filter_field);
      params.set("filter", show.filter_value);
    }
    const suffix = params.toString() ? `?${params}` : "";
    navigate(`/tabs/${encodeURIComponent(show.tab_api_name)}${suffix}`);
  }

  const columns = resolveRelatedColumns(model, descriptor);
  const recordLinkField =
    model?.record_link_field?.trim() || columns[0]?.field_api_name || undefined;
  const cellTextMode = model?.grid_preferences?.cell_text_mode === "wrap" ? "wrap" : "truncate";
  const preferredSortBy = model?.grid_preferences?.sort_by?.trim() || undefined;
  const preferredSortDir: "asc" | "desc" =
    model?.grid_preferences?.sort_dir === "desc" ? "desc" : "asc";
  const activeSortBy = sortBy ?? preferredSortBy;
  const activeSortDir = sortBy != null ? sortDir : preferredSortBy ? preferredSortDir : sortDir;
  const rows = relatedSectionRows(model);
  const searchServerSide = model?.list_controls?.search_server_side !== false;
  const displayRows = useMemo(() => {
    if (searchServerSide) {
      return rows;
    }
    return filterListRows(rows, columns, debouncedFilter);
  }, [searchServerSide, rows, columns, debouncedFilter]);

  async function saveGridPreferences(prefs: ListGridPreferences) {
    const sortField = prefs.sort_by ?? activeSortBy;
    try {
      await api.saveRelatedSectionGridPreference(vaultId, {
        section_context_token: descriptor.section_context_token,
        grid_preferences: {
          ...prefs,
          sort_by: sortField,
          sort_dir: sortField ? prefs.sort_dir ?? activeSortDir : undefined,
        },
      });
      resetPagination();
      await load(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(defaultRelatedChrome.load_failed));
      throw err;
    }
  }

  function currentGridPreferences(overrides: Partial<ListGridPreferences> = {}): ListGridPreferences {
    const prefs = model?.grid_preferences ?? {};
    const columnFields = columns.map((column) => column.field_api_name);
    return {
      visible_columns: prefs.visible_columns ?? columnFields,
      column_order: prefs.column_order ?? columnFields,
      freeze_column: prefs.freeze_column,
      cell_text_mode: prefs.cell_text_mode ?? "truncate",
      column_widths: prefs.column_widths ?? columnWidths,
      sort_by: activeSortBy,
      sort_dir: activeSortBy ? activeSortDir : undefined,
      ...overrides,
    };
  }

  async function persistSortPreference(next: { sortBy?: string; sortDir: "asc" | "desc" }) {
    await api.saveRelatedSectionGridPreference(vaultId, {
      section_context_token: descriptor.section_context_token,
      grid_preferences: currentGridPreferences({
        sort_by: next.sortBy,
        sort_dir: next.sortBy ? next.sortDir : undefined,
      }),
    });
    setModel((prev) => {
      if (!prev) return prev;
      const nextPrefs = { ...prev.grid_preferences };
      if (next.sortBy) {
        nextPrefs.sort_by = next.sortBy;
        nextPrefs.sort_dir = next.sortDir;
      } else {
        delete nextPrefs.sort_by;
        delete nextPrefs.sort_dir;
      }
      return { ...prev, grid_preferences: nextPrefs };
    });
  }

  function handleSort(field: string) {
    const currentBy = sortBy ?? preferredSortBy;
    const currentDir = sortBy != null ? sortDir : preferredSortBy ? preferredSortDir : sortDir;
    const next = toggleListColumnSort(currentBy, currentDir, field);
    void (async () => {
      try {
        await persistSortPreference(next);
        const needsManualReload = next.sortBy === sortBy && next.sortDir === sortDir;
        setSortBy(next.sortBy);
        setSortDir(next.sortDir);
        resetPagination();
        if (needsManualReload) {
          void load(undefined);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : displayText(defaultRelatedChrome.load_failed));
      }
    })();
  }

  async function persistColumnWidths(nextWidths: Record<string, number>) {
    if (!model) return;
    try {
      await api.saveRelatedSectionGridPreference(vaultId, {
        section_context_token: descriptor.section_context_token,
        grid_preferences: currentGridPreferences({ column_widths: nextWidths }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(defaultRelatedChrome.load_failed));
    }
  }

  function handleColumnWidthChange(fieldApiName: string, width: number) {
    if (!model) return;
    setColumnWidths((prev) => {
      const nextWidths = { ...prev, [fieldApiName]: width };
      if (columnWidthSaveTimerRef.current != null) {
        window.clearTimeout(columnWidthSaveTimerRef.current);
      }
      columnWidthSaveTimerRef.current = window.setTimeout(() => {
        columnWidthSaveTimerRef.current = null;
        void persistColumnWidths(nextWidths);
      }, 400);
      return nextWidths;
    });
  }

  const createAllowed = viewOnly ? false : (model?.create_allowed ?? descriptor.create_allowed);
  const nextToken = model?.next_page_token;
  const loadedCount = rows.length;
  const serverTotal = model?.total ?? loadedCount;
  const filterActive = isListFilterActive(debouncedFilter);
  const { currentPage, totalPages } = listPageNavigation(
    pageHistory.length,
    RELATED_SECTION_PAGE_SIZE,
    model?.total,
  );
  const pageRange = listPageRange(
    pageHistory.length,
    RELATED_SECTION_PAGE_SIZE,
    displayRows.length,
    model?.total,
  );
  const rangeText =
    loadedCount > 0
      ? filterActive && !searchServerSide
        ? displayTextTemplate(
            chrome.filtered_range_text ?? defaultRelatedChrome.filtered_range_text,
            listFilteredRange(displayRows.length, loadedCount),
          )
        : serverTotal > 0
          ? displayTextTemplate(chrome.range_text, pageRange)
          : null
      : null;
  const showPagination =
    !filterActive || searchServerSide
      ? serverTotal > RELATED_SECTION_PAGE_SIZE || Boolean(nextToken) || pageHistory.length > 0
      : false;
  const hasRowActions =
    !viewOnly &&
    (model?.row_actions_allowed ??
      sectionCommands.unlink_allowed ??
      displayRows.some((row) => {
        const actions = (row as { actions?: RelatedRowActions }).actions;
        return rowHasRecordActions(actions);
      }));
  const rowRecordActionsAllowed = Boolean(model?.row_record_actions_allowed);
  const staticRowActions = useMemo(
    () =>
      sectionCommands.unlink_allowed
        ? resolveRelatedRowActions(undefined, sectionCommands.unlink_allowed)
        : undefined,
    [sectionCommands.unlink_allowed],
  );

  return (
    <div className={`related-section${hideHeader ? " related-section--inline" : ""}`}>
      {!hideHeader && (
        <Button
          type="text"
          block
          className="related-section__toggle"
          onClick={() => void toggle()}
          aria-expanded={showBody}
        >
          <span className="related-section__chevron">{showBody ? "▾" : "▸"}</span>
          <span className="related-section__title">{label}</span>
        </Button>
      )}

      {showBody && (
        <div className="related-section__body">
          {error && <Alert type="error" title={error} showIcon role="alert" />}
          {loading && !model && (
            <Spin description={displayText(chrome.loading)} className="related-section__loading" />
          )}
          {(model || (loading && !model)) && (
            <>
              <div className="related-section__toolbar">
                <div className="related-section__toolbar-start">
                  {createAllowed && !descriptor.prevent_record_create && (
                    <RelatedCreateButton
                      vaultId={vaultId}
                      sectionToken={descriptor.section_context_token}
                      targetObjectApiName={descriptor.target_object_api_name}
                      modalCreateRecord={useModalCreate}
                      chrome={chrome}
                      onCreated={handleCreateSuccess}
                      onError={(msg) => setError(msg || null)}
                    />
                  )}
                  {sectionCommands.add_existing_allowed && (
                    <Button
                      size="small"
                      className="related-section__add-existing"
                      onClick={() => setShowAddExisting(true)}
                    >
                      {displayText(chrome.add_existing)}
                    </Button>
                  )}
                  {canViewAddDependencies && (
                    <Button size="small" onClick={() => void openDependencies()}>
                      {displayText(cfg.view_add_dependencies)}
                    </Button>
                  )}
                  {(rows.length > 0 || model) && (
                    <Input.Search
                      size="small"
                      className="related-section__search"
                      value={filter}
                      placeholder={displayText(shell.filter)}
                      aria-label={displayText(shell.filter)}
                      onChange={(e) => setFilter(e.target.value)}
                    />
                  )}
                  {!viewOnly && sectionCommands.show_in_tab && (
                    <Button size="small" onClick={() => openSectionInTab()}>
                      {displayText(chrome.show_in_tab)}
                    </Button>
                  )}
                </div>
                <div className="related-section__toolbar-end">
                  {showPagination && rangeText && (
                    <ListPagination
                      rangeLabel={rangeText}
                      currentPage={currentPage}
                      totalPages={totalPages}
                      hasPrevious={pageHistory.length > 0}
                      hasNext={Boolean(nextToken)}
                      loading={loading}
                      previousAria={displayText(defaultListChrome.previous_page)}
                      nextAria={displayText(defaultListChrome.next_page)}
                      pageInputAria={displayText(defaultListChrome.page_input_label)}
                      onPrevious={goPreviousPage}
                      onNext={goNextPage}
                      onGoToPage={goToPage}
                    />
                  )}
                  {!showPagination && rangeText && (
                    <span className="related-section__range">{rangeText}</span>
                  )}
                  {!viewOnly && model?.edit_columns_allowed && (
                    <ListActionsMenu
                      ariaLabel={displayText(defaultListChrome.list_actions_aria)}
                      disabled={loading}
                    >
                      {(close) => (
                        <Button
                          type="text"
                          role="menuitem"
                          className="list-actions-menu__item list-actions-menu__item--edit-columns"
                          disabled={loading}
                          onClick={() => {
                            close();
                            setEditColumnsOpen(true);
                          }}
                        >
                          {displayText(defaultListChrome.edit_columns)}
                        </Button>
                      )}
                    </ListActionsMenu>
                  )}
                </div>
              </div>
              {showAddExisting && (
                <RelatedAddExistingDialog
                  vaultId={vaultId}
                  sectionToken={descriptor.section_context_token}
                  chrome={chrome}
                  onLinked={(section) => {
                    applySectionMutation(section);
                  }}
                  onClose={() => setShowAddExisting(false)}
                  onError={(msg) => setError(msg || null)}
                />
              )}
              <Modal
                open={showDependencies}
                className="related-section__deps-modal"
                title={displayText(cfg.view_add_dependencies_dialog_title)}
                onCancel={() => setShowDependencies(false)}
                onOk={() => void addSelectedDependencies()}
                okText={displayText(shell.save)}
                cancelText={displayText(shell.cancel)}
                okButtonProps={{ loading: depsAdding }}
                width={960}
                destroyOnHidden
                centered
              >
                <div className="related-section__deps-body">
                  <p className="related-section__deps-description">
                    {displayText(cfg.view_add_dependencies_dialog_description)}
                  </p>
                  {depsWarning ? (
                    <div className="related-section__deps-warning" role="status">
                      <WarningOutlined className="related-section__deps-warning-icon" aria-hidden />
                      <span>{displayText(cfg.view_add_dependencies_target_vault_warning)}</span>
                    </div>
                  ) : null}
                  {depsError ? (
                    <Alert type="error" showIcon title={depsError} className="related-section__deps-error" />
                  ) : null}
                  {depsLoading ? (
                    <div className="related-section__deps-loading">
                      <Spin />
                    </div>
                  ) : depsItems.length === 0 ? (
                    <p className="related-section__deps-empty">
                      {displayText(cfg.no_missing_dependencies)}
                    </p>
                  ) : (
                    <>
                      <div className="related-section__deps-toolbar">
                        <Button
                          type="link"
                          className="related-section__deps-select-all"
                          onClick={() =>
                            setDepsSelected(depsItems.map((item) => item.vault_component_id))
                          }
                        >
                          {displayText(cfg.select_all_dependencies)}
                        </Button>
                        <Pagination
                          size="small"
                          className="related-section__deps-pagination"
                          current={depsPage}
                          pageSize={depsPageSize}
                          total={depsItems.length}
                          showSizeChanger={false}
                          onChange={(page) => setDepsPage(page)}
                        showTotal={(total, range) =>
                          displayTextTemplate(cfg.deps_pagination_range, {
                            start: range[0],
                            end: range[1],
                            total,
                          })
                        }
                        />
                      </div>
                      <div className="related-section__deps-table">
                        <Table<OutboundDependencyCandidate>
                          size="small"
                          bordered
                          rowKey="vault_component_id"
                          columns={dependencyDialogColumns}
                          dataSource={depsItems.slice(
                            (depsPage - 1) * depsPageSize,
                            depsPage * depsPageSize,
                          )}
                          scroll={{ y: 360, x: true }}
                          pagination={false}
                          rowSelection={{
                            columnWidth: 40,
                            selectedRowKeys: depsSelected,
                            onChange: (keys) => {
                              const pageIds = new Set(
                                depsItems
                                  .slice((depsPage - 1) * depsPageSize, depsPage * depsPageSize)
                                  .map((item) => item.vault_component_id),
                              );
                              setDepsSelected((prev) => {
                                const kept = prev.filter((id) => !pageIds.has(id));
                                return [...kept, ...keys.map(String)];
                              });
                            },
                            preserveSelectedRowKeys: true,
                          }}
                        />
                      </div>
                    </>
                  )}
                </div>
              </Modal>
              {selectionEnabled && rows.length > 0 && (
                <div className="related-section__selection-bar">
                  <Button size="small" loading={selectingAll} onClick={() => void handleSelectAll()}>
                    {displayText(chrome.select_all)}
                  </Button>
                  <Button size="small" disabled={selectedIds.length === 0} onClick={handleUnselectAll}>
                    {displayText(chrome.unselect_all)}
                  </Button>
                  {selectedIds.length > 0 && (
                    <span className="related-section__selection-count">
                      {displayTextTemplate(chrome.selected_count, { count: selectedIds.length })}
                    </span>
                  )}
                  {sectionCommands.bulk_unlink_allowed && selectedIds.length > 0 && (
                    <Button
                      size="small"
                      danger
                      loading={bulkRemoving}
                      onClick={() => handleBulkRemove()}
                    >
                      {displayText(chrome.bulk_remove)}
                    </Button>
                  )}
                </div>
              )}
              <DataTable
                columns={columns}
                records={displayRows}
                vaultId={vaultId}
                objectApiName={detailObjectApiName}
                recordLinkField={recordLinkField}
                displayContext={model?.display_context}
                sortBy={activeSortBy}
                sortDir={activeSortDir}
                cellTextMode={cellTextMode}
                columnWidths={columnWidths}
                onColumnWidthChange={handleColumnWidthChange}
                linkToRecordLabel={defaultListChrome.link_to_record}
                onSort={viewOnly ? undefined : handleSort}
                actionsPlacement="first"
                selectable={selectionEnabled}
                selectedRowKeys={selectedIds}
                onSelectionChange={setSelectedIds}
                renderRowActions={
                  hasRowActions
                    ? (recordId) => (
                        <LazyRecordRowActionMenu
                          vaultId={vaultId}
                          objectName={detailObjectApiName}
                          recordId={recordId}
                          enabled={hasRowActions}
                          staticActions={staticRowActions}
                          fetchOnOpen={rowRecordActionsAllowed}
                          fetchActions={
                            rowRecordActionsAllowed
                              ? async () =>
                                  (
                                    await api.relatedRecordRowActions(
                                      vaultId,
                                      descriptor.section_context_token,
                                      recordId,
                                    )
                                  ).actions
                              : undefined
                          }
                          removing={removingId === recordId}
                          deletingRecord={deletingRecordId === recordId}
                          lifecyclePending={isRowLifecycleBusy(recordId)}
                          onRemove={() => void removeRelationship(recordId)}
                          onDeleteRecord={(actions) =>
                            void deleteRelatedRecord(recordId, actions)
                          }
                          onEditRecord={(actions) => {
                            const objectName =
                              actions.target_object_api_name || detailObjectApiName;
                            const targetRecordId =
                              actions.target_record_id?.trim() || recordId;
                            navigate(recordEditHref(objectName, targetRecordId));
                          }}
                          onLifecycleAction={(action, actions) => {
                            const objectName =
                              actions.target_object_api_name || detailObjectApiName;
                            const targetRecordId =
                              actions.target_record_id?.trim() || recordId;
                            void handleRowLifecycleAction(objectName, targetRecordId, action);
                          }}
                          onSdkAction={(action, actions) => {
                            const objectName =
                              actions.target_object_api_name || detailObjectApiName;
                            const targetRecordId =
                              actions.target_record_id?.trim() || recordId;
                            handleRowSdkAction(objectName, targetRecordId, action);
                          }}
                          unlinkLabel={chrome.remove_relationship}
                          actionsAria={chrome.actions}
                        />
                      )
                    : undefined
                }
              />
            </>
          )}
        </div>
      )}

      {model && !viewOnly && (
        <EditColumnsDialog
          key={`${editColumnsOpen}-${descriptor.section_context_token}`}
          open={editColumnsOpen}
          chrome={defaultListChrome}
          availableColumns={
            Array.isArray(model.available_columns)
              ? model.available_columns
              : Array.isArray(model.columns)
                ? model.columns
                : descriptor.columns
          }
          defaultColumns={
            Array.isArray(model.default_columns)
              ? model.default_columns
              : Array.isArray(model.columns)
                ? model.columns
                : descriptor.columns
          }
          current={model.grid_preferences ?? {}}
          onClose={() => setEditColumnsOpen(false)}
          onSave={saveGridPreferences}
        />
      )}

      {dialogTarget && (
        <WorkflowStartModal
          open={workflowDialogAction != null}
          action={workflowDialogAction}
          page={dialogTarget.page}
          vaultId={vaultId}
          objectName={dialogTarget.objectName}
          recordId={dialogTarget.recordId}
          values={workflowFieldValues}
          participantValues={workflowParticipantValues}
          dateValues={workflowDateValues}
          pending={lifecyclePending}
          onValuesChange={setWorkflowFieldValues}
          onParticipantValuesChange={setWorkflowParticipantValues}
          onDateValuesChange={setWorkflowDateValues}
          onCancel={cancelActionDialog}
          onConfirm={() => void confirmWorkflowDialog()}
        />
      )}
      {dialogTarget && (
        <PreExecutionDialogModal
          open={preExecutionActionKind != null && preExecutionDialog != null}
          actionLabel={preExecutionActionLabel}
          actionName={preExecutionActionName}
          dialog={preExecutionDialog}
          values={preExecutionInputValues}
          pending={lifecyclePending}
          onValuesChange={setPreExecutionInputValues}
          onCancel={cancelActionDialog}
          onConfirm={() => void confirmPreExecutionDialog()}
        />
      )}
      {vaultId &&
      (descriptor.target_object_api_name === "document__v" ||
        descriptor.remote_object_api_name === "document__v") ? (
        <DocumentViewerPanel
          vaultId={vaultId}
          objectApiName={
            documentUploadRequest?.target.objectName ||
            descriptor.remote_object_api_name ||
            descriptor.target_object_api_name
          }
          recordId={documentUploadRequest?.target.recordId}
          modalHostOnly
          toolbarOnly
          documentUploadRequest={documentUploadRequest}
          onDocumentUploadComplete={completeDocumentUpload}
          onDocumentUploadHandled={clearDocumentUploadRequest}
          documentActions={documentUploadRequest?.target.page.sdk_actions}
          onRecordPageReload={async () => {
            await loadRef.current?.(pageTokenRef.current);
          }}
        />
      ) : null}
    </div>
  );
}
