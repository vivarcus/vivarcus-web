import type { ComponentProps } from "react";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { ListColumn, ListRecordRow } from "../api/types";
import { UiProvider } from "../context/UiContext";
import { defaultShellChrome } from "../lib/i18n";
import { toggleListColumnSort } from "../lib/objectListPage";
import { DataTable } from "./DataTable";

function SortableTableHarness({
  initialSortBy,
  initialSortDir,
}: {
  initialSortBy?: string;
  initialSortDir?: "asc" | "desc";
}) {
  const [sortBy, setSortBy] = useState<string | undefined>(initialSortBy);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(initialSortDir ?? "asc");

  return (
    <DataTable
      columns={columns}
      records={records}
      sortBy={sortBy}
      sortDir={sortDir}
      onSort={(field) => {
        const next = toggleListColumnSort(sortBy, sortDir, field);
        setSortBy(next.sortBy);
        setSortDir(next.sortDir);
      }}
    />
  );
}

const columns: ListColumn[] = [
  { field_api_name: "name__v", label: "Name", sortable: true },
  { field_api_name: "status__v", label: "Status", sortable: true },
];

const records: ListRecordRow[] = [
  { record_id: "1", fields: { name__v: "Alpha", status__v: "open" } },
  { record_id: "2", fields: { name__v: "Beta", status__v: "closed" } },
];

function renderTable(props: Partial<ComponentProps<typeof DataTable>> = {}) {
  const onSort = vi.fn();
  render(
    <MemoryRouter>
      <UiProvider>
        <DataTable
          columns={columns}
          records={records}
          sortBy="name__v"
          sortDir="desc"
          onSort={onSort}
          {...props}
        />
      </UiProvider>
    </MemoryRouter>,
  );
  return { onSort };
}

describe("DataTable sort", () => {
  it("calls onSort when clicking a different column header", async () => {
    const user = userEvent.setup();
    const { onSort } = renderTable();
    await user.click(screen.getByRole("columnheader", { name: /Status/i }));
    expect(onSort).toHaveBeenCalledWith("status__v");
  });

  it("calls onSort when clicking the active desc column header", async () => {
    const user = userEvent.setup();
    const { onSort } = renderTable();
    await user.click(screen.getByRole("columnheader", { name: /Name/i }));
    expect(onSort).toHaveBeenCalledWith("name__v");
  });

  it("calls onSort when clicking the active asc column header", async () => {
    const user = userEvent.setup();
    const { onSort } = renderTable({ sortBy: "name__v", sortDir: "asc" });
    await user.click(screen.getByRole("columnheader", { name: /Name/i }));
    expect(onSort).toHaveBeenCalledWith("name__v");
  });

  it("renders row actions alongside embedded favorite in the name column", () => {
    renderTable({
      recordLinkField: "name__v",
      showFavoriteColumn: true,
      onToggleFavorite: vi.fn(),
      actionsPlacement: "first",
      renderRowActions: () => <button type="button">Row action</button>,
    });
    expect(screen.getAllByRole("button", { name: "Row action" })).toHaveLength(2);
  });

  it("renders Boolean values from localized shell labels", () => {
    render(
      <MemoryRouter>
        <UiProvider
          shell={{
            ...defaultShellChrome,
            metadata_yes: { text: "是" },
            metadata_no: { text: "否" },
          }}
        >
          <DataTable
            columns={[{ field_api_name: "enabled__v", label: "启用", field_type: "Boolean" }]}
            records={[
              { record_id: "1", fields: { enabled__v: true } },
              { record_id: "2", fields: { enabled__v: false } },
            ]}
          />
        </UiProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText("是")).toBeTruthy();
    expect(screen.getByText("否")).toBeTruthy();
  });

  it("prefers localized lifecycle-state options over reference display text", () => {
    renderTable({
      columns: [
        {
          field_api_name: "state__v",
          label: "生命周期状态",
          field_type: "Component",
          field_render: {
            field_type: "Component",
            renderer_kind: "display_text",
            base_field_role: "lifecycle_state",
            picklist_options: [{ name: "active_state__sys", label: "活动" }],
          },
        },
      ],
      records: [
        {
          record_id: "1",
          fields: { state__v: "active_state__sys" },
          reference_cells: {
            state__v: { display_value: "Active" },
          },
        },
      ],
      sortBy: undefined,
      onSort: undefined,
    });

    expect(screen.getByText("活动")).toBeTruthy();
    expect(screen.queryByText("Active")).toBeNull();
  });

  it("cycles asc, desc, and cleared sort on repeated clicks", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <UiProvider>
          <SortableTableHarness />
        </UiProvider>
      </MemoryRouter>,
    );

    const nameHeader = screen.getByRole("columnheader", { name: /Name/i });
    expect(nameHeader).not.toHaveAttribute("aria-sort");

    await user.click(nameHeader);
    expect(nameHeader).toHaveAttribute("aria-sort", "ascending");

    await user.click(nameHeader);
    expect(nameHeader).toHaveAttribute("aria-sort", "descending");

    await user.click(nameHeader);
    expect(nameHeader).not.toHaveAttribute("aria-sort");

    await user.click(nameHeader);
    expect(nameHeader).toHaveAttribute("aria-sort", "ascending");
  });
});
