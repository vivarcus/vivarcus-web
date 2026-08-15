import { describe, expect, it } from "vitest";
import type { ObjectListModel } from "../api/types";
import { deriveObjectListPagination, sortStateFromListResponse, toggleListColumnSort } from "./objectListPage";

function listModel(overrides: Partial<ObjectListModel> = {}): ObjectListModel {
  return {
    tab_api_name: "studies__v",
    tab_label: { text: "Studies", key: "tab.studies" },
    object_api_name: "study__v",
    selected_view: "all",
    views: [{ id: "all", label: { text: "All", key: "view.all" } }],
    columns: [
      {
        field_api_name: "name__v",
        label: { text: "Name", key: "field.name" },
        filterable: true,
      },
    ],
    records: [{ record_id: "1", fields: {} }],
    pagination: {
      page_size: 20,
      total: 100,
      has_previous: false,
      next_page_token: "next",
    },
    actions: { allowed: true, requires_type_selection: false, object_types: [] },
    display_context: {},
    ...overrides,
  };
}

describe("deriveObjectListPagination", () => {
  it("computes page range for the first page", () => {
    const result = deriveObjectListPagination(listModel(), undefined, []);
    expect(result.pageStart).toBe(1);
    expect(result.pageEnd).toBe(1);
    expect(result.currentPage).toBe(1);
    expect(result.totalPages).toBe(5);
    expect(result.showPagination).toBe(true);
    expect(result.displayFilterColumns).toHaveLength(1);
  });

  it("hides pagination for recent view", () => {
    const result = deriveObjectListPagination(listModel({ selected_view: "recent" }), "recent", []);
    expect(result.showPagination).toBe(false);
  });
});

describe("sortStateFromListResponse", () => {
  it("keeps sort unselected when the query has no explicit sort", () => {
    expect(
      sortStateFromListResponse({}, { sort_by: "name__v", sort_dir: "desc" }),
    ).toEqual({ sortBy: undefined, sortDir: "asc" });
  });

  it("reflects explicit sort from list controls", () => {
    expect(
      sortStateFromListResponse(
        { sortBy: "status__v" },
        { sort_by: "status__v", sort_dir: "desc" },
      ),
    ).toEqual({ sortBy: "status__v", sortDir: "desc" });
  });
});

describe("toggleListColumnSort", () => {
  it("cycles asc, desc, and cleared on the same column", () => {
    expect(toggleListColumnSort("name__v", "asc", "name__v")).toEqual({
      sortBy: "name__v",
      sortDir: "desc",
    });
    expect(toggleListColumnSort("name__v", "desc", "name__v")).toEqual({
      sortBy: undefined,
      sortDir: "asc",
    });
    expect(toggleListColumnSort(undefined, "asc", "name__v")).toEqual({
      sortBy: "name__v",
      sortDir: "asc",
    });
  });
});
