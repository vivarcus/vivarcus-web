import { describe, expect, it } from "vitest";
import { filterListRows, listRowMatchesFilter } from "./filterListRows";
import type { ListColumn, ListRecordRow } from "../api/types";

const stateColumn: ListColumn = {
  field_api_name: "state__v",
  label: { text: "State" },
  field_type: "Component",
  field_render: {
    field_ref: { field_api_name: "state__v" },
    field_type: "Component",
    renderer_kind: "display_text",
    support_state: "readonly_only",
    visibility: "visible",
    editability: "readonly",
    requiredness: "optional",
    required_satisfaction: "satisfied",
    picklist_options: [{ name: "candidate_state__v", label: "Candidate" }],
  },
};

describe("filterListRows", () => {
  it("matches lifecycle state labels from column catalog", () => {
    const row: ListRecordRow = {
      record_id: "r1",
      fields: { state__v: "candidate_state__v", name__v: "France" },
    };
    expect(listRowMatchesFilter(row, [stateColumn], "candidate")).toBe(true);
    expect(listRowMatchesFilter(row, [stateColumn], "france")).toBe(true);
    expect(listRowMatchesFilter(row, [stateColumn], "active")).toBe(false);
  });

  it("matches reference cell display values", () => {
    const row: ListRecordRow = {
      record_id: "r1",
      fields: { study__vr: "STUDY-1" },
      reference_cells: {
        study__vr: { display_value: "Phase III Oncology" },
      },
    };
    expect(
      listRowMatchesFilter(
        row,
        [{ field_api_name: "study__vr", label: { text: "Study" } }],
        "oncology",
      ),
    ).toBe(true);
  });

  it("returns all rows when filter is blank", () => {
    const rows: ListRecordRow[] = [
      { record_id: "r1", fields: { name__v: "A" } },
      { record_id: "r2", fields: { name__v: "B" } },
    ];
    expect(filterListRows(rows, [], "   ")).toEqual(rows);
  });
});
