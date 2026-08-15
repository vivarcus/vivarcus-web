import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { ListColumn, ListRecordRow } from "../api/types";
import { UiProvider } from "../context/UiContext";
import { DataTable } from "./DataTable";

describe("DataTable reference_cells", () => {
  it("prefers reference_cells display_value over raw record id when field_render is present", () => {
    const columns: ListColumn[] = [
      {
        field_api_name: "type__v",
        label: "Document Type",
        field_type: "Object",
        target_object_api_name: "document_type__v",
        field_render: {
          field_ref: { field_api_name: "type__v" },
          field_type: "Object",
          target_object_api_name: "document_type__v",
          renderer_kind: "display_link",
        },
      },
    ];
    const records: ListRecordRow[] = [
      {
        record_id: "EDL1",
        fields: { type__v: "LPM00000000000D" },
        reference_cells: {
          type__v: { display_value: "Plan" },
        },
      },
    ];

    render(
      <MemoryRouter>
        <UiProvider>
          <DataTable columns={columns} records={records} />
        </UiProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText("Plan")).toBeTruthy();
    expect(screen.queryByText("LPM00000000000D")).toBeNull();
  });
});
