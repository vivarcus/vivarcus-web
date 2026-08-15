import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { ListColumn, ListRecordRow } from "../api/types";
import { UiProvider } from "../context/UiContext";
import type { RecordNavState } from "../lib/vaultNav";
import { DataTable } from "./DataTable";

const columns: ListColumn[] = [{ field_api_name: "name__v", label: "Name" }];
const records: ListRecordRow[] = [
  { record_id: "r1", fields: { name__v: "Alpha" } },
  { record_id: "r2", fields: { name__v: "Beta" } },
];

function LocationProbe() {
  const location = useLocation();
  return (
    <pre data-testid="nav-state">{JSON.stringify((location.state as RecordNavState) ?? null)}</pre>
  );
}

describe("DataTable record nav state", () => {
  it("passes list position state when opening a record link", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/list"]}>
        <UiProvider>
          <Routes>
            <Route
              path="/list"
              element={
                <DataTable
                  columns={columns}
                  records={records}
                  vaultId="v1"
                  objectApiName="study__v"
                  recordLinkField="name__v"
                  recordNav={{
                    pageRecordIds: ["r1", "r2"],
                    pageStart: 1,
                    recordTotal: 22,
                    tabApiName: "studies",
                    tabLabel: "Studies",
                  }}
                />
              }
            />
            <Route path="/objects/:objectName/records/:recordId" element={<LocationProbe />} />
          </Routes>
        </UiProvider>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("link", { name: "Beta" }));

    expect(JSON.parse(screen.getByTestId("nav-state").textContent ?? "null")).toEqual({
      tabApiName: "studies",
      tabLabel: "Studies",
      recordIndex: 2,
      recordTotal: 22,
      pageStart: 1,
      pageRecordIds: ["r1", "r2"],
    });
  });
});
