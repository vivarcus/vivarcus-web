import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MetadataSecurityProfileListModel } from "../api/types";
import { AntdProvider } from "../theme/antdProvider";

vi.mock("../hooks/useVaultId", () => ({ useVaultId: () => "vault-1" }));
vi.mock("../api/client", () => ({
  api: { metadataSecurityProfiles: vi.fn() },
}));

import { api } from "../api/client";
import { AdminMetadataSecurityProfilesPage } from "./AdminMetadataSecurityProfilesPage";

const list = api.metadataSecurityProfiles as unknown as ReturnType<typeof vi.fn>;

function model(): MetadataSecurityProfileListModel {
  return {
    model_type: "metadata_security_profiles_list",
    vault_id: "vault-1",
    security_profiles: [
      { api_name: "business_admin__v", label: "Business Admin", namespace: "", source: "standard", active: true, description: "", permission_set_count: 3 },
      { api_name: "external_inspector__c", label: "External Inspector", namespace: "", source: "custom", active: true, description: "", permission_set_count: 1 },
      { api_name: "legacy__c", label: "Legacy", namespace: "", source: "custom", active: false, description: "", permission_set_count: 0 },
    ],
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AntdProvider>
        <AdminMetadataSecurityProfilesPage />
      </AntdProvider>
    </MemoryRouter>,
  );
}

function rowNames(): string[] {
  return within(screen.getByRole("table"))
    .getAllByRole("button")
    .map((b) => b.textContent ?? "");
}

async function selectOption(comboIndex: number, optionName: string) {
  fireEvent.mouseDown(screen.getAllByRole("combobox")[comboIndex]);
  fireEvent.click(
    await screen.findByText(optionName, { selector: ".ant-select-item-option-content" }),
  );
}

describe("AdminMetadataSecurityProfilesPage", () => {
  beforeEach(() => {
    list.mockReset();
    list.mockResolvedValue(model());
  });

  it("lists profiles with Name column and permission set counts", async () => {
    renderPage();
    await waitFor(() => expect(rowNames()).toHaveLength(3));
    expect(screen.getByText("Name", { selector: ".ant-table-column-title" })).toBeTruthy();
    const table = within(screen.getByRole("table"));
    expect(table.getByText("3")).toBeTruthy();
  });

  it("filters by status (active only)", async () => {
    renderPage();
    await waitFor(() => expect(rowNames()).toHaveLength(3));
    await selectOption(1, "Active");
    await waitFor(() => expect(rowNames()).toEqual(["Business Admin", "External Inspector"]));
  });
});
