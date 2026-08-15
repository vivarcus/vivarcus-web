import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MetadataPermissionSetObjectDetailModel } from "../api/types";
import { AntdProvider } from "../theme/antdProvider";

vi.mock("../hooks/useVaultId", () => ({ useVaultId: () => "vault-1" }));
vi.mock("../api/client", () => ({
  api: {
    metadataPermissionSetObjectDetail: vi.fn(),
  },
}));

import { api } from "../api/client";
import { AdminMetadataPermissionSetObjectDetailPage } from "./AdminMetadataPermissionSetObjectDetailPage";

const objectDetail = api.metadataPermissionSetObjectDetail as unknown as ReturnType<typeof vi.fn>;

const CRUD4 = ["read", "create", "edit", "delete"];

function objectModel(): MetadataPermissionSetObjectDetailModel {
  return {
    model_type: "metadata_permission_set_object_detail",
    vault_id: "vault-1",
    permission_set_api_name: "ctms_cra__c",
    permission_set_label: "CTMS CRA",
    object_name: "study__v",
    object_label: "Study",
    object_types: [
      { api_name: "base__v", label: "Base Study" },
      { api_name: "interventional__v", label: "Interventional" },
    ],
    object_permissions: [
      {
        api_name: "base__v",
        label: "Base Study",
        actions: ["read", "create", "edit"],
        available_actions: CRUD4,
        inherited_actions: ["read", "create"],
        is_default: false,
      },
      {
        api_name: "interventional__v",
        label: "Interventional",
        actions: ["read"],
        available_actions: CRUD4,
        inherited_actions: ["read"],
        is_default: false,
      },
    ],
    field_permissions: [
      {
        api_name: "study__v",
        label: "",
        actions: ["read", "edit"],
        available_actions: ["read", "edit"],
        inherited_actions: ["read", "edit"],
        is_default: true,
      },
      {
        api_name: "study_country__v",
        label: "Study Country",
        actions: ["read", "edit"],
        available_actions: ["read", "edit"],
        inherited_actions: ["read"],
        is_default: false,
        object_types: ["base__v", "interventional__v"],
      },
      {
        api_name: "budget__c",
        label: "Budget",
        actions: ["read"],
        available_actions: ["read", "edit"],
        inherited_actions: ["read"],
        is_default: false,
        object_types: ["interventional__v"],
      },
    ],
    control_permissions: [
      {
        api_name: "study__v",
        label: "",
        actions: ["view"],
        available_actions: ["view"],
        inherited_actions: ["view"],
        is_default: true,
      },
    ],
  };
}

function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={["/admin/users-groups/permission_sets/ctms_cra__c/objects/study__v"]}
    >
      <AntdProvider>
        <Routes>
          <Route
            path="/admin/users-groups/permission_sets/:permissionSetName/objects/:objectName"
            element={<AdminMetadataPermissionSetObjectDetailPage />}
          />
        </Routes>
      </AntdProvider>
    </MemoryRouter>,
  );
}

describe("AdminMetadataPermissionSetObjectDetailPage", () => {
  beforeEach(() => {
    objectDetail.mockReset();
    objectDetail.mockResolvedValue(objectModel());
  });

  it("fetches and renders the object's permission matrix", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: /^Study$/ })).toBeTruthy();
    expect(objectDetail).toHaveBeenCalledWith("vault-1", "ctms_cra__c", "study__v");
    const setLink = screen.getByRole("link", { name: "CTMS CRA" }) as HTMLAnchorElement;
    expect(setLink.getAttribute("href")).toBe("/admin/users-groups/permission_sets/ctms_cra__c");
    expect(screen.queryByText("study__v")).toBeNull();
    expect(screen.queryByText("ctms_cra__c")).toBeNull();
  });

  it("renders the three Veeva sections with per-action columns", async () => {
    renderPage();
    await screen.findByText("All Object Fields");
    expect(screen.getAllByText("Object Permissions").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Object Field Permissions").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Object Control Permissions").length).toBeGreaterThan(0);
    expect(screen.queryByText("Record Action Permissions")).toBeNull();
    expect(screen.getByText("Base Study")).toBeTruthy();
    expect(screen.getByText("Interventional")).toBeTruthy();
    // Object Permissions: Read / Create / Edit / Delete columns.
    expect(screen.getAllByRole("columnheader", { name: "Read" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("columnheader", { name: "Create" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("columnheader", { name: "Edit" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("columnheader", { name: "Delete" }).length).toBeGreaterThan(0);
    // Field Permissions: View column appears in controls; Edit appears in fields.
    expect(screen.getAllByRole("columnheader", { name: "View" }).length).toBeGreaterThan(0);
  });

  it("marks inherited grants with an asterisk", async () => {
    renderPage();
    await screen.findByText("All Object Fields");
    const fieldsSection = document.getElementById("perm-obj-study__v-fields") as HTMLElement;
    // All Object Fields row: both Read and Edit are inherited → two stars.
    const defaultRow = within(fieldsSection).getByText("All Object Fields").closest("tr") as HTMLElement;
    expect(defaultRow.querySelectorAll(".perm-crud-cell__star").length).toBe(2);
    // Study Country: read inherited, edit explicit → one star.
    const countryRow = within(fieldsSection).getByText("Study Country").closest("tr") as HTMLElement;
    expect(countryRow.querySelectorAll(".perm-crud-cell__star").length).toBe(1);
  });

  it("renders an object-type filter selector on the field section", async () => {
    renderPage();
    await screen.findByText("All Object Fields");
    const fieldsSection = document.getElementById("perm-obj-study__v-fields") as HTMLElement;
    expect(within(fieldsSection).getByRole("combobox")).toBeTruthy();
    expect(within(fieldsSection).getByText("Study Country")).toBeTruthy();
    expect(within(fieldsSection).getByText("Budget")).toBeTruthy();
  });
});
