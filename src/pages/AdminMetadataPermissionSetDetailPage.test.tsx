import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MetadataPermissionSetDetailModel } from "../api/types";
import { AntdProvider } from "../theme/antdProvider";

vi.mock("../hooks/useVaultId", () => ({ useVaultId: () => "vault-1" }));
vi.mock("../api/client", () => ({
  api: {
    metadataPermissionSetDetail: vi.fn(),
    metadataPermissionSetObjectDetail: vi.fn(),
  },
}));

import { api } from "../api/client";
import { AdminMetadataPermissionSetDetailPage } from "./AdminMetadataPermissionSetDetailPage";

const detail = api.metadataPermissionSetDetail as unknown as ReturnType<typeof vi.fn>;

const CRUD = ["create", "read", "edit", "delete", "switch_type", "execute"];

function model(): MetadataPermissionSetDetailModel {
  return {
    model_type: "metadata_permission_set_detail",
    vault_id: "vault-1",
    api_name: "ctms_cra__c",
    label: "Clinical Research Associates",
    namespace: "",
    source: "custom",
    active: true,
    description: "CRA permission set",
    categories: [
      {
        key: "admin",
        label: "Admin",
        order: 0,
        entries: [
          { key: "security.users", actions: ["read"], available_actions: [] },
          { key: "configuration.settings", actions: ["read", "edit"], available_actions: [] },
        ],
      },
      {
        key: "application",
        label: "Application",
        order: 1,
        entries: [
          {
            key: "vault_actions.reporting",
            actions: ["read"],
            available_actions: ["read", "create", "edit", "delete"],
          },
        ],
      },
      {
        key: "tabs",
        label: "Tabs",
        order: 3,
        entries: [
          { key: "tab.home__v.tab_actions", actions: ["view"], available_actions: ["view"] },
          {
            key: "tab.issue_management__ctms.issues__c.tab_actions",
            actions: ["view"],
            available_actions: ["view"],
          },
          {
            key: "tab.issue_management__ctms.observations__c.tab_actions",
            actions: ["view"],
            available_actions: ["view"],
          },
        ],
      },
    ],
    object_labels: {},
    field_labels: {},
    object_type_labels: {},
    record_action_labels: {},
    entry_labels: {
      "tab.home__v.tab_actions": "Home",
      "tab.issue_management__ctms": "Issue Management",
      "tab.issue_management__ctms.issues__c.tab_actions": "All Issues",
      "tab.issue_management__ctms.observations__c.tab_actions": "Observations",
    },
    used_by: {
      security_profiles: [
        { api_name: "business_admin__v", label: "Business Administrator", active: true },
      ],
      application_roles: [
        { api_name: "custom_admin__c", label: "Admin Role Binding", active: false },
      ],
    },
    // Full object universe: study__v grants read/create/edit at the object level; activity__v is
    // present but grants only read.
    objects: [
      {
        api_name: "study__v",
        label: "Study",
        source: "standard",
        actions: ["read", "create", "edit"],
        available_actions: CRUD,
        object_types: [
          {
            api_name: "base__v",
            label: "Base Study",
            actions: ["read", "create", "edit"],
            available_actions: CRUD,
          },
        ],
      },
      {
        api_name: "activity__v",
        label: "Activity",
        source: "standard",
        actions: ["read"],
        available_actions: CRUD,
        object_types: [],
      },
    ],
    // Full tab universe (includes an ungranted tab so the viewer can show withheld View).
    tabs: [
      {
        api_name: "home__v",
        label: "Home",
        actions: ["view"],
        available_actions: ["view"],
        subtabs: [],
      },
      {
        api_name: "issue_management__ctms",
        label: "Issue Management",
        actions: [],
        available_actions: ["view"],
        subtabs: [
          {
            api_name: "issues__c",
            label: "All Issues",
            actions: ["view"],
            available_actions: ["view"],
          },
          {
            api_name: "observations__c",
            label: "Observations",
            actions: ["view"],
            available_actions: ["view"],
          },
        ],
      },
      {
        api_name: "reports__c",
        label: "Reports",
        actions: [],
        available_actions: ["view"],
        subtabs: [],
      },
    ],
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/admin/users-groups/permission_sets/ctms_cra__c"]}>
      <AntdProvider>
        <Routes>
          <Route
            path="/admin/users-groups/permission_sets/:permissionSetName"
            element={<AdminMetadataPermissionSetDetailPage />}
          />
        </Routes>
      </AntdProvider>
    </MemoryRouter>,
  );
}

describe("AdminMetadataPermissionSetDetailPage", () => {
  beforeEach(() => {
    detail.mockReset();
    detail.mockResolvedValue(model());
  });

  it("renders the summary and per-tab counts", async () => {
    renderPage();
    expect(
      await screen.findByRole("heading", { level: 1, name: "Clinical Research Associates" }),
    ).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Details" })).toBeTruthy();
    // Objects tab lists the full object universe (study__v, activity__v).
    expect(screen.getByText("Objects (2)")).toBeTruthy();
    expect(screen.getByText("Admin (2)")).toBeTruthy();
  });

  it("shows where the permission set is used (impact)", async () => {
    renderPage();
    expect(await screen.findByText("Used By")).toBeTruthy();
    expect(screen.getByText("Security Profiles (1)")).toBeTruthy();
    expect(screen.getByText("Application Roles (1)")).toBeTruthy();
    expect(screen.getByText("Business Administrator")).toBeTruthy();
    expect(screen.getByText("Admin Role Binding")).toBeTruthy();
    expect(screen.getByText(/inactive/)).toBeTruthy();
  });

  it("lists every object with a Veeva-style Read/Create/Edit/Delete checkbox matrix", async () => {
    renderPage();
    const studyLink = await screen.findByRole("link", { name: "Study" });
    // Both objects in the universe are listed (including activity__v).
    expect(screen.getByRole("link", { name: "Activity" })).toBeTruthy();
    // Nested object types appear as indented plain labels under the parent object.
    expect(screen.getByText("Base Study")).toBeTruthy();
    // Column headers match Veeva's Objects tab.
    expect(screen.getByRole("columnheader", { name: "Read" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Create" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Edit" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Delete" })).toBeTruthy();
    // study__v grants read/create/edit -> three checked boxes, delete unchecked.
    const row = studyLink.closest("tr") as HTMLElement;
    const checks = row.querySelectorAll('input[type="checkbox"]');
    expect(checks).toHaveLength(4);
    expect((checks[0] as HTMLInputElement).checked).toBe(true); // read
    expect((checks[1] as HTMLInputElement).checked).toBe(true); // create
    expect((checks[2] as HTMLInputElement).checked).toBe(true); // edit
    expect((checks[3] as HTMLInputElement).checked).toBe(false); // delete
  });

  it("links each object to its dedicated permission page", async () => {
    renderPage();
    const studyLink = (await screen.findByRole("link", { name: "Study" })) as HTMLAnchorElement;
    expect(studyLink.getAttribute("href")).toBe(
      "/admin/users-groups/permission_sets/ctms_cra__c/objects/study__v",
    );
    const activityLink = screen.getByRole("link", { name: "Activity" }) as HTMLAnchorElement;
    expect(activityLink.getAttribute("href")).toBe(
      "/admin/users-groups/permission_sets/ctms_cra__c/objects/activity__v",
    );
  });

  it("renders Tabs as a Veeva-style collection/subtab hierarchy with a View column", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("tab", { name: /Tabs/ }));
    expect(await screen.findByText("Home")).toBeTruthy();
    // Full universe includes ungranted tabs (Reports) and collection parents with nested subtabs.
    expect(screen.getByText("Reports")).toBeTruthy();
    expect(screen.getByText("Issue Management")).toBeTruthy();
    expect(screen.getByText("All Issues")).toBeTruthy();
    expect(screen.getByText("Observations")).toBeTruthy();
    expect(screen.queryByText(/Tab ·/)).toBeNull();
    expect(screen.queryByText("tab.home__v.tab_actions")).toBeNull();
    expect(screen.getByRole("columnheader", { name: "Tab" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "View" })).toBeTruthy();
    // Parent with only nested grants has View unchecked; Home (direct grant) is checked.
    const homeRow = screen.getByText("Home").closest("tr") as HTMLElement;
    expect((homeRow.querySelector('input[type="checkbox"]') as HTMLInputElement).checked).toBe(
      true,
    );
    const collectionRow = screen.getByText("Issue Management").closest("tr") as HTMLElement;
    expect(
      (collectionRow.querySelector('input[type="checkbox"]') as HTMLInputElement).checked,
    ).toBe(false);
    const reportsRow = screen.getByText("Reports").closest("tr") as HTMLElement;
    expect(
      (reportsRow.querySelector('input[type="checkbox"]') as HTMLInputElement).checked,
    ).toBe(false);
  });

  it("humanizes flat capability keys (Admin) instead of showing the raw dotted key", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("tab", { name: /Admin/ }));
    // Veeva-style section heading + in-section label (prefix dropped).
    expect(await screen.findByRole("heading", { name: "Security", level: 3 })).toBeTruthy();
    expect(screen.getByText("Users")).toBeTruthy();
    expect(screen.queryByText("security.users")).toBeNull();
    expect(screen.queryByText("Security · Users")).toBeNull();
  });

  it("groups Application capabilities under Veeva section headings", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("tab", { name: /Application/ }));
    expect(await screen.findByRole("heading", { name: "Vault Actions", level: 3 })).toBeTruthy();
  });

  it("filters objects by name and updates tab counts", async () => {
    const user = userEvent.setup();
    renderPage();
    const search = await screen.findByPlaceholderText("Search permissions across all tabs");
    await user.type(search, "activity");
    // Objects has 1 matching object (activity__v); Admin has 0.
    await waitFor(() => expect(screen.getByText("Objects (1 / 2)")).toBeTruthy());
    expect(screen.getByText("Admin (0 / 2)")).toBeTruthy();
  });
});
