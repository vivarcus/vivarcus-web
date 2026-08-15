import type { ListColumn, ListRecordRow, ObjectListModel } from "../api/types";
import type { FacetFilters } from "./facetFilters";

export const OBJECT_LIST_PAGE_SIZE_OPTIONS = [20, 50, 100, 200] as const;

export type ObjectListQuery = {
  view?: string;
  pageToken?: string;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  filter?: string;
  filterField?: string;
  facetFilters?: FacetFilters;
};

type ListSortControls = {
  sort_by?: string;
  sort_dir?: string;
};

/** Map list response controls to UI sort state. Implicit/default server sort stays unselected. */
export function sortStateFromListResponse(
  query: Pick<ObjectListQuery, "sortBy">,
  controls?: ListSortControls,
): { sortBy?: string; sortDir: "asc" | "desc" } {
  if (query.sortBy) {
    return {
      sortBy: controls?.sort_by,
      sortDir: controls?.sort_dir === "desc" ? "desc" : "asc",
    };
  }
  return { sortBy: undefined, sortDir: "asc" };
}

/** Cycle explicit list sort: asc → desc → cleared (implicit default order). */
export function toggleListColumnSort(
  sortBy: string | undefined,
  sortDir: "asc" | "desc",
  field: string,
): { sortBy?: string; sortDir: "asc" | "desc" } {
  if (sortBy === field) {
    if (sortDir === "asc") {
      return { sortBy: field, sortDir: "desc" };
    }
    return { sortBy: undefined, sortDir: "asc" };
  }
  return { sortBy: field, sortDir: "asc" };
}

export type ObjectListPagination = {
  selectedView: string;
  nextToken: string | undefined;
  showPagination: boolean;
  displayFilterColumns: ListColumn[];
  filterCandidateColumns: ListColumn[];
  records: ListRecordRow[];
  pageStart: number;
  pageEnd: number;
  currentPage: number;
  totalPages?: number;
};

export function deriveObjectListPagination(
  model: ObjectListModel | null,
  view: string | undefined,
  pageHistory: string[],
): ObjectListPagination {
  const selectedView = view ?? model?.selected_view ?? "all";
  const records = model?.records ?? [];
  const pageSize = model?.pagination.page_size ?? 0;
  const pageStart =
    model && model.pagination.total >= 0
      ? pageHistory.length * pageSize + (records.length > 0 ? 1 : 0)
      : 0;
  const pageEnd =
    model && records.length > 0 ? pageHistory.length * pageSize + records.length : 0;

  const filterCandidateColumns = (
    model?.filter_editor_columns ??
    model?.facet_filter_columns ??
    model?.columns ??
    []
  ).filter((col) => col.facetable !== false || col.filterable === true);
  const displaySource =
    model?.display_facet_filter_columns && model.display_facet_filter_columns.length > 0
      ? model.display_facet_filter_columns
      : filterCandidateColumns;

  const currentPage = pageHistory.length + 1;
  const totalPages =
    model && model.pagination.total >= 0 && pageSize > 0
      ? Math.max(1, Math.ceil(model.pagination.total / pageSize))
      : undefined;

  return {
    selectedView,
    nextToken: model?.pagination.next_page_token,
    showPagination: selectedView !== "recent",
    displayFilterColumns: displaySource,
    filterCandidateColumns,
    records,
    pageStart,
    pageEnd,
    currentPage,
    totalPages,
  };
}
