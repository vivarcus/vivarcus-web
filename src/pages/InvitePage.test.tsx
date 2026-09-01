import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../auth/AuthProvider";
import { saveLoginLang } from "../auth/rememberedUser";
import { InvitePage } from "./InvitePage";

const peekInvite = vi.fn();
const completeInvite = vi.fn();

vi.mock("../api/client", async () => {
  const actual = await vi.importActual<typeof import("../api/client")>("../api/client");
  return {
    ...actual,
    api: {
      ...actual.api,
      peekInvite: (...args: unknown[]) => peekInvite(...args),
      completeInvite: (...args: unknown[]) => completeInvite(...args),
    },
  };
});

function renderInvite(token = "tok") {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[`/invite?token=${token}`]}>
        <Routes>
          <Route path="/invite" element={<InvitePage />} />
          <Route path="/login" element={<div>login page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe("InvitePage", () => {
  beforeEach(() => {
    saveLoginLang("en");
    peekInvite.mockReset();
    completeInvite.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sets the initial password from a valid invite", async () => {
    peekInvite.mockResolvedValue({
      username: "ada@example.com",
      needs_password: true,
    });
    completeInvite.mockResolvedValue({
      username: "ada@example.com",
      needs_password: false,
    });
    const user = userEvent.setup();
    renderInvite();
    await waitFor(() => {
      expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    });
    await user.type(screen.getByLabelText("Password"), "Demo-Password1!");
    await user.type(screen.getByLabelText("Confirm password"), "Demo-Password1!");
    await user.click(screen.getByRole("button", { name: "Set password" }));
    await waitFor(() => {
      expect(completeInvite).toHaveBeenCalledWith("tok", "Demo-Password1!");
    });
    expect(await screen.findByText("Password saved. You can sign in.")).toBeInTheDocument();
  });

  it("lets a password-reset invite set a new password", async () => {
    peekInvite.mockResolvedValue({
      username: "ada@example.com",
      needs_password: false,
    });
    completeInvite.mockResolvedValue({
      username: "ada@example.com",
      needs_password: false,
    });
    const user = userEvent.setup();
    renderInvite();
    await waitFor(() => {
      expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    });
    await user.type(screen.getByLabelText("Password"), "Demo-Password1!");
    await user.type(screen.getByLabelText("Confirm password"), "Demo-Password1!");
    await user.click(screen.getByRole("button", { name: "Set password" }));
    await waitFor(() => {
      expect(completeInvite).toHaveBeenCalledWith("tok", "Demo-Password1!");
    });
  });

  it("shows an invalid-link error", async () => {
    peekInvite.mockRejectedValue(new Error("invite_invalid"));
    renderInvite();
    await waitFor(() => {
      expect(
        screen.getByText("This invitation link is invalid or has expired."),
      ).toBeInTheDocument();
    });
  });
});
