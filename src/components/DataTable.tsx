import { Button, Table, type TableColumnsType } from "antd";
import { StarFilled, StarOutlined } from "@ant-design/icons";
import { Link, useSearchParams } from "react-router-dom";
import type { MouseEvent, ReactNode, ThHTMLAttributes } from "react";
import { forwardRef, useMemo } from "react";
import type { DisplayContext, DisplayText, FacetFieldResult, ListColumn, ListRecordRow } from "../api/types";
import { recordDetailHref } from "../lib/fields";
import { displayText, formatFieldDisplayValue, defaultRelatedChrome, resolveDisplayFormatValue } from "../lib/i18n";
import { listCellFieldRender, listCellTooltipText } from "../lib/listCellFieldRender";
import {
  defaultListColumnWidth,
  measureHeaderColumnWidths,
  readColumnPixelWidth,
  useColumnWidths,
} from "../lib/columnResize";
import { useUi } from "../context/UiContext";
import { buildRecordNavState, getLastTab, type ListRecordNavContext } from "../lib/vaultNav";
import { ColumnHeaderFilter } from "./ColumnHeaderFilter";
import { FieldValue } from "./FieldValue";
import type { FacetFilters } from "./FacetFilterPanel";

type ResizableHeaderCellProps = ThHTMLAttributes<HTMLTableCellElement> & {
  resizeField?: string;
  resizeLabel?: string;
  onBeginResize?: (
    fieldApiName: string,
    startX: number,
    startWidth: number,
    tableRoot: HTMLElement,
    baselineWidths: Record<string, number>,
  ) => void;
};

const ResizableHeaderCell = forwardRef<HTMLTableCellElement, ResizableHeaderCellProps>(
  function ResizableHeaderCell(
    {
      resizeField,
      resizeLabel,
      onBeginResize,
      children,
      className,
      ...rest
    },
    ref,
  ) {
    const classes = [className, resizeField ? "data-table__header-th--resizable" : undefined]
      .filter(Boolean)
      .join(" ");

    return (
      <th {...rest} ref={ref} className={classes || undefined}>
        {children}
        {resizeField && onBeginResize && (
          <span
            className="data-table__col-resize-handle"
            role="separator"
            aria-orientation="vertical"
            aria-label={resizeLabel ? `Resize ${resizeLabel} column` : "Resize column"}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              event.currentTarget.setPointerCapture(event.pointerId);
              const th = event.currentTarget.closest("th");
              const tableRoot = th?.closest(".table-wrap");
              const headerRow = th?.closest("tr");
              if (!tableRoot || !th || !headerRow) {
                return;
              }
              const startWidth = readColumnPixelWidth(th);
              onBeginResize(
                resizeField,
                event.clientX,
                startWidth,
                tableRoot,
                measureHeaderColumnWidths(headerRow),
              );
            }}
            onClick={(event) => event.stopPropagation()}
          />
        )}
      </th>
    );
  },
);

type Props = {
  columns: ListColumn[];
  records: ListRecordRow[];
  vaultId?: string;
  objectApiName?: string;
  recordLinkField?: string;
  displayContext?: DisplayContext;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  cellTextMode?: "truncate" | "wrap";
  onSort?: (field: string) => void;
  renderRowActions?: (recordId: string, row: ListRecordRow) => ReactNode;
  actionsColumnLabel?: string;
  actionsPlacement?: "first" | "last";
  selectable?: boolean;
  selectedRowKeys?: string[];
  onSelectionChange?: (keys: string[]) => void;
  loading?: boolean;
  showFavoriteColumn?: boolean;
  favoritePendingId?: string | null;
  onToggleFavorite?: (recordId: string, favorited: boolean) => void | Promise<void>;
  addFavoriteAria?: DisplayText;
  removeFavoriteAria?: DisplayText;
  linkToRecordLabel?: DisplayText;
  facetFilters?: FacetFilters;
  facetFields?: FacetFieldResult[];
  facetFilterDisabled?: boolean;
  facetChrome?: {
    facet_undefined?: DisplayText;
    facet_search_placeholder?: DisplayText;
    facet_clear_field?: DisplayText;
  };
  onFacetFilterChange?: (fieldApiName: string, filter: import("../lib/facetFilters").FacetFilterSpec) => void;
  emptyText?: DisplayText;
  columnWidths?: Record<string, number>;
  onColumnWidthChange?: (fieldApiName: string, width: number) => void;
  /** When set, record-name links carry location state for detail-page prev/next. */
  recordNav?: ListRecordNavContext;
};

function parseBooleanCellValue(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1") return true;
  if (value === 0 || value === "0") return false;
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return null;
}

function CellValue({
  vaultId,
  tabApiName,
  objectApiName,
  recordLinkField,
  column,
  row,
  displayContext,
  linkToRecordLabel,
  recordNav,
}: {
  vaultId?: string;
  tabApiName?: string;
  objectApiName?: string;
  recordLinkField?: string;
  column: ListColumn;
  row: ListRecordRow;
  displayContext?: DisplayContext;
  linkToRecordLabel?: DisplayText;
  recordNav?: ListRecordNavContext;
}) {
  const { shell } = useUi();
  const raw = row.fields[column.field_api_name];
  const refCell = row.reference_cells?.[column.field_api_name];
  const fieldType = column.field_type ?? column.field_render?.field_type;
  const isRecordLink =
    Boolean(recordLinkField) &&
    column.field_api_name === recordLinkField &&
    Boolean(vaultId && objectApiName);
  const emptyLinkText = displayText(linkToRecordLabel, "[Link to Record]");
  const recordLinkState =
    isRecordLink && recordNav ? buildRecordNavState(recordNav, row.record_id) : undefined;

  if (!isRecordLink && fieldType === "Boolean") {
    const booleanValue = parseBooleanCellValue(raw);
    if (booleanValue !== null) {
      return (
        <span>
          {displayText(booleanValue ? shell.metadata_yes : shell.metadata_no)}
        </span>
      );
    }
  }

  if (!isRecordLink && column.field_render?.base_field_role === "lifecycle_state") {
    const localizedState = formatFieldDisplayValue(
      raw,
      "Picklist",
      displayContext,
      column.field_render.picklist_options,
    );
    if (localizedState) {
      return <span>{localizedState}</span>;
    }
  }

  if (!isRecordLink) {
    const fieldRender = listCellFieldRender(column, raw) ?? column.field_render;
    if (fieldRender) {
      const refDisplay = refCell?.display_value;
      const displayValue = refDisplay ?? fieldRender.display_value ?? raw;
      const mergedFieldRender =
        refDisplay != null && refDisplay !== ""
          ? { ...fieldRender, display_value: refDisplay }
          : fieldRender;
      if (
        (displayValue == null || displayValue === "") &&
        mergedFieldRender.display_value == null &&
        !mergedFieldRender.icon
      ) {
        return (
          <span className="field-value field-value--empty">
            {displayText(shell.empty_value)}
          </span>
        );
      }
      return (
        <FieldValue
          vaultId={vaultId}
          value={raw}
          fieldApiName={column.field_api_name}
          fieldType={column.field_type ?? column.field_render?.field_type}
          targetObjectApiName={column.target_object_api_name}
          tabApiName={tabApiName}
          displayContext={displayContext}
          fieldRender={mergedFieldRender}
          navigationTarget={refCell?.navigation_target ?? fieldRender.navigation_target}
          hoverCard={refCell?.hover_card}
        />
      );
    }
  }

  if (refCell) {
    const displayValue = refCell.display_value ?? raw;
    if (displayValue == null || displayValue === "") {
      if (isRecordLink) {
        return (
          <Link
            to={recordDetailHref(vaultId!, objectApiName!, row.record_id, tabApiName)}
            state={recordLinkState}
            className="field-value field-value--link"
            onClick={(e) => e.stopPropagation()}
          >
            {emptyLinkText}
          </Link>
        );
      }
      return (
        <span className="field-value field-value--empty">
          {displayText(shell.empty_value)}
        </span>
      );
    }
    const recordId = String(raw ?? displayValue);
    const columnFieldType = column.field_type ?? column.field_render?.field_type;
    const text = formatFieldDisplayValue(
      resolveDisplayFormatValue(raw, columnFieldType, displayValue),
      columnFieldType,
      displayContext,
      column.field_render?.picklist_options,
    );
    const routeRef = refCell.navigation_target?.route_ref?.trim();
    if (routeRef) {
      const linkText = text.trim() || recordId;
      return (
        <Link
          to={routeRef}
          className="field-value field-value--link"
          onClick={(e) => e.stopPropagation()}
        >
          {linkText}
        </Link>
      );
    }
    return <span>{text}</span>;
  }

  if (raw == null || raw === "") {
    if (isRecordLink) {
      return (
        <Link
          to={recordDetailHref(vaultId!, objectApiName!, row.record_id, tabApiName)}
          state={recordLinkState}
          className="field-value field-value--link"
          onClick={(e) => e.stopPropagation()}
        >
          {emptyLinkText}
        </Link>
      );
    }
    return (
      <span className="field-value field-value--empty">
        {displayText(shell.empty_value)}
      </span>
    );
  }

  const text = formatFieldDisplayValue(
    raw,
    column.field_type,
    displayContext,
    column.field_render?.picklist_options,
  );

  if (isRecordLink) {
    const linkText = text.trim() ? text : emptyLinkText;
    return (
      <Link
        to={recordDetailHref(vaultId!, objectApiName!, row.record_id, tabApiName)}
        state={recordLinkState}
        className={`field-value field-value--link${column.field_api_name === "id" ? " mono" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {linkText}
      </Link>
    );
  }

  return <span>{text}</span>;
}

export function DataTable({
  columns,
  records,
  vaultId,
  objectApiName,
  recordLinkField,
  displayContext,
  sortBy,
  sortDir,
  cellTextMode = "truncate",
  onSort,
  renderRowActions,
  actionsColumnLabel,
  actionsPlacement = "last",
  selectable = false,
  selectedRowKeys = [],
  onSelectionChange,
  loading = false,
  showFavoriteColumn = false,
  favoritePendingId = null,
  onToggleFavorite,
  addFavoriteAria,
  removeFavoriteAria,
  linkToRecordLabel,
  facetFilters,
  facetFields,
  facetFilterDisabled,
  facetChrome,
  onFacetFilterChange,
  emptyText,
  columnWidths,
  onColumnWidthChange,
  recordNav,
}: Props) {
  const [searchParams] = useSearchParams();
  const tabApiName = searchParams.get("tab") ?? (vaultId ? getLastTab(vaultId) : undefined);

  const { shell } = useUi();
  const hasActions = Boolean(renderRowActions);
  const safeColumns = Array.isArray(columns) ? columns : [];
  const { widths: resolvedColumnWidths, beginResize } = useColumnWidths(
    columnWidths,
    onColumnWidthChange,
  );
  const resizable = Boolean(onColumnWidthChange);
  const hasCustomColumnWidths = Object.keys(resolvedColumnWidths).length > 0;
  const facetFieldByName = new Map((facetFields ?? []).map((field) => [field.field_api_name, field]));
  const showHeaderFilters = Boolean(onFacetFilterChange && facetChrome);
  const embedActionsInFirstColumn = hasActions && actionsPlacement === "first";
  const embedFavoriteInRecordLink =
    showFavoriteColumn && Boolean(recordLinkField) && Boolean(onToggleFavorite);

  const hasFrozenColumn = safeColumns.some((col) => col.frozen);
  // Ant Design's horizontal scroll path (ResizeObserver + triggerOnScroll) can loop with
  // sticky headers on React 19. Only enable it for frozen columns, which require it.
  const enableAntdHorizontalScroll = hasFrozenColumn;
  // Resizable lists always resolve a width per column (preference or default) so fixed
  // layout + native overflow can scroll instead of crushing cells into the viewport.
  const useFixedColumnLayout = resizable || hasCustomColumnWidths;

  const tableScrollX = useMemo(() => {
    if (!useFixedColumnLayout || safeColumns.length === 0) {
      return "max-content" as const;
    }
    let total = 0;
    if (showFavoriteColumn && onToggleFavorite && !embedFavoriteInRecordLink) {
      total += 40;
    }
    if (selectable) {
      total += 48;
    }
    for (const col of safeColumns) {
      const preferred = resolvedColumnWidths[col.field_api_name];
      if (preferred != null && preferred > 0) {
        total += preferred;
        continue;
      }
      const isRecordLink =
        Boolean(recordLinkField) && col.field_api_name === recordLinkField;
      const isFirstWithActions = embedActionsInFirstColumn && col === safeColumns[0];
      total += defaultListColumnWidth(displayText(col.label, col.field_api_name), {
        recordLink: isRecordLink || isFirstWithActions,
        filterable: showHeaderFilters && col.filterable === true,
      });
    }
    if (hasActions && actionsPlacement === "last") {
      total += 120;
    }
    return total > 0 ? total : ("max-content" as const);
  }, [
    useFixedColumnLayout,
    resolvedColumnWidths,
    safeColumns,
    showFavoriteColumn,
    onToggleFavorite,
    embedFavoriteInRecordLink,
    selectable,
    hasActions,
    actionsPlacement,
    recordLinkField,
    showHeaderFilters,
    embedActionsInFirstColumn,
  ]);

  if (safeColumns.length === 0) {
    return <p className="empty-state">{displayText(shell.empty_no_columns)}</p>;
  }

  function handleSortableHeaderClick(event: MouseEvent<HTMLElement>, fieldApiName: string) {
    if (!onSort) return;
    const target = event.target as HTMLElement;
    if (target.closest(".column-header-filter")) return;
    onSort(fieldApiName);
  }

  function renderFavoriteStar(row: ListRecordRow) {
    if (!onToggleFavorite) return null;
    const favorited = Boolean(row.favorited);
    const pending = favoritePendingId === row.record_id;
    return (
      <Button
        type="text"
        className={`data-table__row-star${favorited ? " data-table__row-star--active" : ""}`}
        aria-pressed={favorited}
        aria-label={
          favorited ? displayText(removeFavoriteAria) : displayText(addFavoriteAria)
        }
        disabled={pending}
        loading={pending}
        icon={favorited ? <StarFilled /> : <StarOutlined />}
        onClick={(e) => {
          e.stopPropagation();
          void onToggleFavorite(row.record_id, !favorited);
        }}
      />
    );
  }

  const tableColumns: TableColumnsType<ListRecordRow> = safeColumns.map((col, index) => {
    const sortable = col.sortable !== false && Boolean(onSort);
    const active = sortBy === col.field_api_name;
    const frozenClass = col.frozen ? "data-table__cell--frozen" : undefined;
    const isRecordLinkColumn = Boolean(recordLinkField) && col.field_api_name === recordLinkField;
    const withEmbeddedFavorite = embedFavoriteInRecordLink && isRecordLinkColumn;
    const withRowActions = embedActionsInFirstColumn && index === 0;
    const cellClassName = [
      frozenClass,
      withRowActions ? "data-table__first-col-with-actions" : undefined,
      withEmbeddedFavorite ? "data-table__record-link-col" : undefined,
    ]
      .filter(Boolean)
      .join(" ");
    const selectedFilter = facetFilters?.[col.field_api_name] ?? {};
    const headerFilterable = showHeaderFilters && col.filterable === true;
    const columnLabel = displayText(col.label, col.field_api_name);
    const preferredWidth = resolvedColumnWidths[col.field_api_name];
    const columnWidth =
      preferredWidth ??
      (useFixedColumnLayout
        ? defaultListColumnWidth(columnLabel, {
            recordLink: isRecordLinkColumn || withRowActions,
            filterable: headerFilterable,
          })
        : undefined);

    return {
      key: col.field_api_name,
      dataIndex: col.field_api_name,
      width: columnWidth,
      title: (
        <span className="data-table__header-cell">
          <span className="data-table__header-label">{columnLabel}</span>
          {headerFilterable && (
            <ColumnHeaderFilter
              column={col}
              field={facetFieldByName.get(col.field_api_name)}
              filter={selectedFilter}
              disabled={facetFilterDisabled}
              chrome={facetChrome!}
              onChange={(next) => onFacetFilterChange!(col.field_api_name, next)}
            />
          )}
        </span>
      ),
      className: cellClassName || undefined,
      fixed: col.frozen ? ("start" as const) : undefined,
      sorter: sortable ? { compare: () => 0 } : false,
      sortDirections: ["ascend", "descend"],
      sortOrder: active ? (sortDir === "desc" ? "descend" : "ascend") : null,
      showSorterTooltip: false,
      onCell: (row) => {
        const refCell = row.reference_cells?.[col.field_api_name];
        const cellTitle = listCellTooltipText(
          col,
          row.fields[col.field_api_name],
          refCell?.display_value,
          Boolean(refCell?.hover_card),
        );
        return {
          className: cellClassName || undefined,
          title: cellTitle,
        };
      },
      onHeaderCell: () => ({
        className: cellClassName || undefined,
        "data-column-field": col.field_api_name,
        onClick: sortable
          ? (event: MouseEvent<HTMLElement>) => handleSortableHeaderClick(event, col.field_api_name)
          : undefined,
        ...(resizable
          ? {
              resizeField: col.field_api_name,
              resizeLabel: displayText(col.label, col.field_api_name),
              onBeginResize: beginResize,
            }
          : {}),
      }),
      render: (_value, row) => {
        const cell = (
          <CellValue
            vaultId={vaultId}
            tabApiName={tabApiName ?? undefined}
            objectApiName={objectApiName}
            recordLinkField={recordLinkField}
            column={col}
            row={row}
            displayContext={displayContext}
            linkToRecordLabel={linkToRecordLabel}
            recordNav={recordNav}
          />
        );
        const actions = withRowActions ? renderRowActions?.(row.record_id, row) : null;
        if (withEmbeddedFavorite || actions) {
          return (
            <div
              className={`data-table__name-cell${actions ? " data-table__name-cell--with-actions" : ""}`}
            >
              {withEmbeddedFavorite ? renderFavoriteStar(row) : null}
              <span className="data-table__name-main">{cell}</span>
              {actions ? (
                <div className="data-table__first-col-actions" onClick={(e) => e.stopPropagation()}>
                  {actions}
                </div>
              ) : null}
            </div>
          );
        }
        return cell;
      },
    };
  });

  if (hasActions && actionsPlacement === "last") {
    tableColumns.push({
      key: "__actions",
      className: "data-table__actions-col",
      title: actionsColumnLabel ?? displayText(defaultRelatedChrome.actions),
      onCell: () => ({ className: "data-table__actions-col" }),
      onHeaderCell: () => ({ className: "data-table__actions-col" }),
      render: (_value, row) => (
        <div onClick={(e) => e.stopPropagation()}>{renderRowActions?.(row.record_id, row)}</div>
      ),
    });
  }

  if (showFavoriteColumn && onToggleFavorite && !embedFavoriteInRecordLink) {
    tableColumns.unshift({
      key: "__favorite",
      className: "data-table__favorite-col",
      width: 40,
      fixed: "start",
      title: "",
      onCell: () => ({ className: "data-table__favorite-col" }),
      onHeaderCell: () => ({ className: "data-table__favorite-col" }),
      render: (_value, row) => {
        const favorited = Boolean(row.favorited);
        const pending = favoritePendingId === row.record_id;
        return (
          <Button
            type="text"
            className={`data-table__row-star${favorited ? " data-table__row-star--active" : ""}`}
            aria-pressed={favorited}
            aria-label={
              favorited
                ? displayText(removeFavoriteAria)
                : displayText(addFavoriteAria)
            }
            disabled={pending}
            loading={pending}
            icon={favorited ? <StarFilled /> : <StarOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              void onToggleFavorite(row.record_id, !favorited);
            }}
          >
          </Button>
        );
      },
    });
  }

  return (
    <div
      className={`table-wrap${cellTextMode === "wrap" ? " table-wrap--wrap-cells" : ""}${
        resizable ? " table-wrap--resizable" : ""
      }${hasCustomColumnWidths ? " table-wrap--column-widths" : ""}${
        !enableAntdHorizontalScroll ? " table-wrap--native-x-scroll" : ""
      }${loading ? " table-wrap--loading" : ""}`}
    >
      <Table<ListRecordRow>
        className="data-table"
        columns={tableColumns}
        dataSource={records}
        rowKey="record_id"
        pagination={false}
        sticky={enableAntdHorizontalScroll}
        // Fixed once columns have explicit widths (defaults and/or preferences) so
        // resized columns do not bounce and multi-column lists do not crush cells.
        tableLayout={useFixedColumnLayout ? "fixed" : "auto"}
        scroll={enableAntdHorizontalScroll ? { x: tableScrollX } : undefined}
        components={
          resizable
            ? {
                header: {
                  cell: ResizableHeaderCell,
                },
              }
            : undefined
        }
        locale={{
          emptyText: (
            <span className="data-table__empty">{displayText(emptyText ?? shell.empty_no_records)}</span>
          ),
        }}
        rowSelection={
          selectable
            ? {
                selectedRowKeys,
                preserveSelectedRowKeys: true,
                onChange: (keys) => onSelectionChange?.(keys.map(String)),
              }
            : undefined
        }
      />
    </div>
  );
}
