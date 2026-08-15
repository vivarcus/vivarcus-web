import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../api/client";
import { VaultUserAdminActions } from "./VaultUserAdminActions";

vi.mock("../../api/client", () => ({
  api: {
    vqlQuery: vi.fn(),
    domainSettings: vi.fn(),
    updateVaultUserProfile: vi.fn(),
    updateVaultUserSecurityPolicy: vi.fn(),
    disableDomainUser: vi.fn(),
    enableDomainUser: vi.fn(),
  },
  HttpError: class HttpError extends Error {},
}));

const domainUserId = "11111111-1111-1111-1111-111111111111";

function mockProfile(fields: Record<string, unknown> = {}) {
  vi.mocked(api.vqlQuery).mockResolvedValue({
    records: [
      {
        record_id: "rec-1",
        fields: {
          domain_user_id__sys: domainUserId,
          username__sys: "ada@demo.example",
          first_name__sys: "Ada",
          last_name__sys: "Lovelace",
          company__sys: "Analytical Engines",
          email__sys: "ada.work@example.com",
          "language__sysr.admin_key__sys": "en",
          "locale__sysr.admin_key__sys": "en_US",
          timezone__sys: "UTC",
          product_announcement_emails__sys: true,
          system_availability_emails__sys: false,
          ...fields,
        },
      },
    ],
  });
}

describe("VaultUserAdminActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders domain profile and security policy actions once the profile loads", async () => {
    mockProfile();
    render(
      <VaultUserAdminActions vaultId="vault-1" recordId="rec-1" onReloaded={() => {}} />,
    );

    expect(await screen.findByRole("button", { name: "Edit Domain Profile" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Security Policy" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: /Domain Status|Disable Domain User|Re-enable/i })).toBeNull();
  });

  it("prefills the edit profile modal with the current identity values", async () => {
    mockProfile();
    const user = userEvent.setup();
    render(
      <VaultUserAdminActions vaultId="vault-1" recordId="rec-1" onReloaded={() => {}} />,
    );

    await user.click(await screen.findByRole("button", { name: "Edit Domain Profile" }));

    const username = await screen.findByDisplayValue("ada@demo.example");
    expect(username).toBeDisabled();
    expect(screen.getByDisplayValue("Ada")).toBeInTheDocument();
    expect(screen.getByDisplayValue("en_US")).toBeInTheDocument();
  });

  it("disables actions and warns when the domain user id is missing", async () => {
    mockProfile({ domain_user_id__sys: "" });
    render(
      <VaultUserAdminActions vaultId="vault-1" recordId="rec-1" onReloaded={() => {}} />,
    );

    expect(await screen.findByRole("button", { name: "Edit Domain Profile" })).toBeDisabled();
    await waitFor(() =>
      expect(
        screen.getByText("Domain user actions are unavailable for this record."),
      ).toBeInTheDocument(),
    );
  });
});
