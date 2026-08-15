import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { DomainUserElement } from "../../api/types";
import { api } from "../../api/client";
import { applyCreateDomainUserDraft, applyDomainUserProfile, DomainUserField } from "./DomainUserField";

vi.mock("../../api/client", () => ({
  api: {
    domainUserOptions: vi.fn(),
  },
}));

function renderReadonly(config: DomainUserElement) {
  return render(
    <DomainUserField
      vaultId="vault-1"
      config={config}
      values={{}}
      onFieldChange={() => {}}
      readOnly
    />,
  );
}

describe("DomainUserField readonly", () => {
  it("shows name and username without duplicate labels", () => {
    renderReadonly({
      domain_id: "novacrest.com",
      read_only: true,
      display_name: "Regulatory Inspector",
      username: "inspector@novacrest.com",
      email: "inspector@novacrest.com",
    });

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Regulatory Inspector")).toBeInTheDocument();
    expect(screen.getByText("Username")).toBeInTheDocument();
    expect(screen.getByText("inspector@novacrest.com")).toBeInTheDocument();
    expect(screen.queryByText("Email")).not.toBeInTheDocument();
  });

  it("shows email when it differs from username", () => {
    renderReadonly({
      domain_id: "novacrest.com",
      read_only: true,
      display_name: "Ming Li",
      username: "li.ming@novacrest.com",
      email: "ming.li@work.example",
    });

    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("ming.li@work.example")).toBeInTheDocument();
  });
});

describe("DomainUserField create", () => {
  it("renders a single required Domain User picker like Veeva", () => {
    vi.mocked(api.domainUserOptions).mockResolvedValue({
      model_type: "domain_user_options",
      options: [],
      has_more: false,
    });

    render(
      <DomainUserField
        vaultId="vault-1"
        config={{
          domain_id: "novacrest.com",
          help_text: { text: "Pick or create a domain user." },
        }}
        values={{}}
        onFieldChange={() => {}}
      />,
    );

    expect(screen.getByText("Domain User")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.queryByText("Pick or create a domain user.")).not.toBeInTheDocument();
  });

  it("opens the Create Domain User modal from the dropdown footer action", async () => {
    const user = userEvent.setup();
    vi.mocked(api.domainUserOptions).mockResolvedValue({
      model_type: "domain_user_options",
      options: [],
      has_more: false,
    });

    render(
      <DomainUserField
        vaultId="vault-1"
        config={{ domain_id: "novacrest.com" }}
        values={{}}
        onFieldChange={() => {}}
      />,
    );

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("button", { name: "+ Create Domain User" }));

    expect(document.querySelector(".create-domain-user-modal")).toBeTruthy();
    expect(screen.getByText("First name")).toBeInTheDocument();
    expect(screen.getByText("User Name")).toBeInTheDocument();
    expect(screen.getByText("Timezone")).toBeInTheDocument();
  });

  it("prefills general info when saving a new domain user draft", () => {
    const onFieldChange = vi.fn();
    applyCreateDomainUserDraft(
      {
        firstName: "Regulatory",
        lastName: "Inspector",
        localpart: "inspector",
        email: "inspector@novacrest.com",
        language: "lang-1",
        locale: "locale-1",
        timezone: "UTC",
      },
      "novacrest.com",
      onFieldChange,
    );

    expect(onFieldChange).toHaveBeenCalledWith("domain_user_id__sys", "");
    expect(onFieldChange).toHaveBeenCalledWith("username__sys", "inspector@novacrest.com");
    expect(onFieldChange).toHaveBeenCalledWith("first_name__sys", "Regulatory");
    expect(onFieldChange).toHaveBeenCalledWith("last_name__sys", "Inspector");
    expect(onFieldChange).toHaveBeenCalledWith("email__sys", "inspector@novacrest.com");
    expect(onFieldChange).toHaveBeenCalledWith("language__sys", "lang-1");
    expect(onFieldChange).toHaveBeenCalledWith("locale__sys", "locale-1");
    expect(onFieldChange).toHaveBeenCalledWith("timezone__sys", "UTC");
    expect(onFieldChange).toHaveBeenCalledWith("name__v", "Regulatory Inspector");
  });

  it("prefills general info when selecting an existing domain user", () => {
    const onFieldChange = vi.fn();
    applyDomainUserProfile(
      {
        user_id: "user-1",
        username: "inspector@novacrest.com",
        label: "Regulatory Inspector (inspector@novacrest.com)",
        first_name: "Regulatory",
        last_name: "Inspector",
        email: "inspector@novacrest.com",
        display_name: "Regulatory Inspector",
      },
      onFieldChange,
    );

    expect(onFieldChange).toHaveBeenCalledWith("domain_user_id__sys", "user-1");
    expect(onFieldChange).toHaveBeenCalledWith("username__sys", "inspector@novacrest.com");
    expect(onFieldChange).toHaveBeenCalledWith("first_name__sys", "Regulatory");
    expect(onFieldChange).toHaveBeenCalledWith("last_name__sys", "Inspector");
    expect(onFieldChange).toHaveBeenCalledWith("email__sys", "inspector@novacrest.com");
    expect(onFieldChange).toHaveBeenCalledWith("name__v", "Regulatory Inspector");
  });
});
