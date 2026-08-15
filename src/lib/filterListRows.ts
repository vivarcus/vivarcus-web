import type { ListColumn, ListRecordRow } from "../api/types";
import { formatFieldDisplayValue } from "./i18n/formatValue";
import { listCellFieldRender } from "./listCellFieldRender";

/** Collects searchable text for one list row using the same display inputs as DataTable. */
export function listRowSearchParts(row: ListRecordRow, columns: ListColumn[]): string[] {
  const parts = new Set<string>();

  for (const value of Object.values(row.fields)) {
    if (value != null && value !== "") {
      parts.add(String(value));
    }
  }

  for (const cell of Object.values(row.reference_cells ?? {})) {
    if (cell.display_value != null && cell.display_value !== "") {
      parts.add(String(cell.display_value));
    }
  }

  for (const column of columns) {
    const raw = row.fields[column.field_api_name];
    const fieldRender = listCellFieldRender(column, raw) ?? column.field_render;
    if (fieldRender?.display_value != null && fieldRender.display_value !== "") {
      parts.add(String(fieldRender.display_value));
    }
    if (raw != null && raw !== "") {
      const label = formatFieldDisplayValue(
        raw,
        column.field_type ?? fieldRender?.field_type,
        undefined,
        fieldRender?.picklist_options,
      );
      if (label) {
        parts.add(label);
      }
    }
  }

  return [...parts];
}

export function listRowMatchesFilter(
  row: ListRecordRow,
  columns: ListColumn[],
  filter: string,
): boolean {
  const needle = filter.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  const haystack = listRowSearchParts(row, columns).join("\n").toLowerCase();
  return haystack.includes(needle);
}

export function filterListRows<R extends ListRecordRow>(
  rows: R[],
  columns: ListColumn[],
  filter: string,
): R[] {
  const needle = filter.trim();
  if (!needle) {
    return rows;
  }
  return rows.filter((row) => listRowMatchesFilter(row, columns, needle));
}
