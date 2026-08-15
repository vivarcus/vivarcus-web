import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MetadataSecurityProfileDetailModel } from "../api/types";
import { AntdProvider } from "../theme/antdProvider";

vi.mock("../hooks/useVaultId", () => ({ useVaultId: () => "vault-1" }));
vi.mock("../api/client", () => ({
  api: { metadataSecurityProfileDetail: vi.fn() },
}));

import { api } from "../api/client";
import { AdminMetadataSecurityProfileDetailPage } from "./AdminMetadataSecurityProfileDetailPage";

const detail = api.metadataSecurityProfileDetail as unknown as ReturnType<typeof vi.fn>;

function model(): MetadataSecurityProfileDetailModel {
  return {
    model_type: "metadata_security_profile_detail",
    vault_id: "vault-1",
    api_name: "system_admin__v",
    label: "System Administrator",
    namespace: "",
    source: "standard",
    active: true,
    description: "Full admin",
    permission_sets: [
      {
        api_name: "ghost_actions__c",
        label: "ghost_actions__c",
        source: "custom",
        active: false,
        exists: false,
        description: "",
      },
      {
        api_name: "system_admin_actions__v",
        label: "System Admin Actions",
        source: "standard",
        active: true,
        exists: true,
        description: "System Administrator permission set",
      },
    ],
    users: [
      {
        user_id: "u1",
        name: "Ada Admin",
        username: "ada.admin@example.com",
        status: "active",
        active: true,
      },
      {
        user_id: "u2",
        name: "Inactive User",
        username: "old.user@example.com",
        status: "disabled",
        active: false,
      },
    ],
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/admin/users-groups/security_profiles/system_admin__v"]}>
      <AntdProvider>
        <Routes>
          <Route
            path="/admin/users-groups/security_profiles/:securityProfileName"
            element={<AdminMetadataSecurityProfileDetailPage />}
          />
        </Routes>
      </AntdProvider>
    </MemoryRouter>,
  );
}

describe("AdminMetadataSecurityProfileDetailPage", () => {
  beforeEach(() => {
    detail.mockReset();
    detail.mockResolvedValue(model());
  });

  it("uses the profile label as the page title with Details / Permission Sets / Users sections", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { level: 1, name: "System Administrator" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Details" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Permission Sets" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Users" })).toBeTruthy();
    expect(screen.getByText("Full admin")).toBeTruthy();
    // Right-hand anchors.
    expect(screen.getByRole("navigation").querySelector('a[href="#sp-system_admin__v-details"]')).toBeTruthy();
    expect(screen.getByRole("navigation").querySelector('a[href="#sp-system_admin__v-users"]')).toBeTruthy();
  });

  it("lists assigned users with Name / User Name / Status", async () => {
    renderPage();
    await screen.findByRole("heading", { level: 1, name: "System Administrator" });
    expect(screen.getByText("Ada Admin")).toBeTruthy();
    expect(screen.getByText("ada.admin@example.com")).toBeTruthy();
    // Default Active Users filter hides inactive members.
    expect(screen.queryByText("Inactive User")).toBeNull();
  });

  it("renders permission set members with Name / Description and links", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { level: 1, name: "System Administrator" })).toBeTruthy();
    const link = screen.getByRole("link", { name: "System Admin Actions" });
    expect(link.getAttribute("href")).toBe(
      "/admin/users-groups/permission_sets/system_admin_actions__v",
    );
    expect(screen.getByText("System Administrator permission set")).toBeTruthy();
  });

  it("marks a dangling permission set reference as missing", async () => {
    renderPage();
    await screen.findByRole("heading", { level: 1, name: "System Administrator" });
    expect(screen.queryByRole("link", { name: /ghost_actions__c/ })).toBeNull();
    await waitFor(() => expect(screen.getByText("missing")).toBeTruthy());
  });
});
