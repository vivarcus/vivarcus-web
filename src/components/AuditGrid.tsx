import { Table, type TableColumnsType } from "antd";
import type { AuditColumn } from "../api/types";
import { formatCellValue } from "../auth/session";
import { defaultAuditChrome, displayText, type AuditChrome } from "../lib/i18n";

type Props = {
  columns: AuditColumn[];
  rows: Array<Record<string, unknown>>;
  chrome?: AuditChrome;
  scrollable?: boolean;
  wrapDescription?: boolean;
  veevaHeader?: boolean;
  listWindow?: boolean;
  emptyText?: string;
};

export function AuditGrid({
  columns,
  rows,
  chrome = defaultAuditChrome,
  scrollable = false,
  wrapDescription = false,
  veevaHeader = false,
  listWindow = false,
  emptyText,
}: Props) {
  if (columns.length === 0) {
    return <p className="empty-state">{displayText(chrome.empty_columns)}</p>;
  }

  const emptyLabel = emptyText?.trim() || displayText(chrome.empty_records);

  const wrapClass = [
    "table-wrap",
    scrollable ? "table-wrap--audit-scroll" : "",
    wrapDescription ? "table-wrap--wrap-cells" : "",
    veevaHeader ? "table-wrap--veeva-audit" : "",
    listWindow ? "table-wrap--audit-list-window" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (veevaHeader) {
    return (
      <div className={wrapClass}>
        <table className="data-table data-table--compact data-table--veeva-audit">
          <colgroup>
            {columns.map((col) => (
              <col key={col.key} style={{ width: veevaColumnWidth(col.key) }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={veevaHeaderCellClass(col.key)}>
                  {veevaColumnTitle(col, chrome)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <span className="data-table__empty">{emptyLabel}</span>
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr
                  key={`${String(row.timestamp ?? "row")}-${String(row.event_description ?? rowIndex)}-${rowIndex}`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={veevaCellClass(col.key, true, wrapDescription) ?? undefined}
                    >
                      {formatCellValue(row[col.key])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  }

  const tableColumns: TableColumnsType<Record<string, unknown>> = columns.map((col) => ({
    key: col.key,
    dataIndex: col.key,
    title: col.label || col.key,
    className:
      wrapDescription && col.key === "event_description"
        ? "data-table__cell--event-description"
        : undefined,
    render: (value: unknown) => formatCellValue(value),
  }));

  return (
    <div className={wrapClass}>
      <Table<Record<string, unknown>>
        className="data-table data-table--compact"
        columns={tableColumns}
        dataSource={rows}
        rowKey={(row, index) =>
          `${String(row.timestamp ?? "row")}-${String(row.event_description ?? index)}-${index}`
        }
        pagination={false}
        locale={{
          emptyText: <span className="data-table__empty">{emptyLabel}</span>,
        }}
      />
    </div>
  );
}

function veevaColumnTitle(col: AuditColumn, chrome: AuditChrome): string {
  const label = col.label?.trim();
  if (label) return label;
  switch (col.key) {
    case "timestamp":
      return displayText(chrome.col_timestamp_alphanumeric, "Timestamp (dd MMM yyyy)");
    case "user_name":
      return displayText(chrome.col_user_name, "User Name");
    case "event_description":
      return displayText(chrome.col_event_description, "Event Description");
    case "record":
      return displayText(chrome.col_record, "Record");
    case "item":
      return displayText(chrome.col_item, "Item");
    default:
      return col.key;
  }
}

function veevaColumnWidth(key: string): string | undefined {
  switch (key) {
    case "timestamp":
      return "22%";
    case "user_name":
      return "20%";
    case "record":
      return "18%";
    case "event_description":
      return undefined;
    default:
      return undefined;
  }
}

function veevaHeaderCellClass(key: string): string {
  return `data-table__veeva-th data-table__veeva-th--${key}`;
}

function veevaCellClass(
  key: string,
  veevaHeader: boolean,
  wrapDescription: boolean,
): string | undefined {
  if (veevaHeader) {
    return key === "event_description" && wrapDescription
      ? "data-table__cell--event-description data-table__veeva-td data-table__veeva-td--event_description"
      : `data-table__veeva-td data-table__veeva-td--${key}`;
  }
  if (wrapDescription && key === "event_description") {
    return "data-table__cell--event-description";
  }
  return undefined;
}
