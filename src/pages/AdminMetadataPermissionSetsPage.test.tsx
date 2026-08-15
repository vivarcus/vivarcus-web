import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MetadataPermissionSetListModel } from "../api/types";
import { AntdProvider } from "../theme/antdProvider";

vi.mock("../hooks/useVaultId", () => ({ useVaultId: () => "vault-1" }));
vi.mock("../api/client", () => ({
  api: { metadataPermissionSets: vi.fn() },
}));

import { api } from "../api/client";
import { AdminMetadataPermissionSetsPage } from "./AdminMetadataPermissionSetsPage";

const list = api.metadataPermissionSets as unknown as ReturnType<typeof vi.fn>;

function model(): MetadataPermissionSetListModel {
  return {
    model_type: "metadata_permission_sets_list",
    vault_id: "vault-1",
    permission_sets: [
      { api_name: "business_admin_actions__v", label: "Business Admin", namespace: "", source: "standard", active: true, description: "", reference_count: 2 },
      { api_name: "ctms_cra__c", label: "CRA", namespace: "", source: "custom", active: true, description: "", reference_count: 1 },
      { api_name: "legacy_actions__c", label: "Legacy", namespace: "", source: "custom", active: false, description: "", reference_count: 0 },
    ],
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AntdProvider>
        <AdminMetadataPermissionSetsPage />
      </AntdProvider>
    </MemoryRouter>,
  );
}

function rowNames(): string[] {
  const table = screen.getByRole("table");
  // The name column renders an antd Button type="link", which is a <button> element.
  return within(table)
    .getAllByRole("button")
    .map((a) => a.textContent ?? "");
}

// selectOption opens an antd Select (by combobox index) and clicks an option by its visible
// label. fireEvent (mouseDown to open, click to choose) is more deterministic than userEvent for
// antd's portal-rendered dropdown under jsdom.
async function selectOption(comboIndex: number, optionName: string) {
  fireEvent.mouseDown(screen.getAllByRole("combobox")[comboIndex]);
  fireEvent.click(
    await screen.findByText(optionName, { selector: ".ant-select-item-option-content" }),
  );
}

describe("AdminMetadataPermissionSetsPage", () => {
  beforeEach(() => {
    list.mockReset();
    list.mockResolvedValue(model());
  });

  it("lists every permission set by default", async () => {
    renderPage();
    await waitFor(() => expect(rowNames()).toHaveLength(3));
    expect(rowNames()).toContain("Business Admin");
    expect(screen.getByText("Name", { selector: ".ant-table-column-title" })).toBeTruthy();
  });

  it("filters by source (custom only)", async () => {
    renderPage();
    await waitFor(() => expect(rowNames()).toHaveLength(3));
    // The first Select is the source filter.
    await selectOption(0, "Custom");
    await waitFor(() => expect(rowNames()).toEqual(["CRA", "Legacy"]));
  });

  it("filters by status (active only)", async () => {
    renderPage();
    await waitFor(() => expect(rowNames()).toHaveLength(3));
    // The second Select is the status filter.
    await selectOption(1, "Active");
    await waitFor(() => expect(rowNames()).toEqual(["Business Admin", "CRA"]));
  });

  it("filters unreferenced (orphaned) sets and tags them Unused", async () => {
    renderPage();
    await waitFor(() => expect(rowNames()).toHaveLength(3));
    // The orphan set (reference_count 0) is tagged Unused in the References column.
    expect(screen.getByText("Unused")).toBeInTheDocument();
    // The third Select is the reference filter.
    await selectOption(2, "Unreferenced");
    await waitFor(() => expect(rowNames()).toEqual(["Legacy"]));
  });
});
