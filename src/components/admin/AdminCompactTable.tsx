import { Table } from "antd";
import type { TableProps } from "antd";

type Props<T extends object> = TableProps<T> & {
  scrollX?: number;
  loadingOverlay?: boolean;
  compact?: boolean;
  fixedLayout?: boolean;
  /** Extra classes on the outer `.table-wrap` (e.g. `table-wrap--metadata`). */
  wrapClassName?: string;
};

export function AdminCompactTable<T extends object>({
  scrollX,
  loadingOverlay = false,
  compact = true,
  fixedLayout = false,
  wrapClassName,
  className,
  size = "small",
  pagination = false,
  ...tableProps
}: Props<T>) {
  const tableClassName = ["data-table", compact && "data-table--compact", className]
    .filter(Boolean)
    .join(" ");
  const wrapClasses = [
    "table-wrap",
    scrollX != null && "table-wrap--native-x-scroll",
    scrollX != null && "table-wrap--column-widths",
    loadingOverlay && "table-wrap--loading",
    wrapClassName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={wrapClasses}>
      <Table<T>
        className={tableClassName}
        size={size}
        pagination={pagination}
        tableLayout={fixedLayout ? "fixed" : undefined}
        {...tableProps}
      />
    </div>
  );
}

export function adminTableEmptyText(text: string) {
  return <span className="data-table__empty">{text}</span>;
}
