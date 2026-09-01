import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/client";
import { UiProvider } from "../context/UiContext";
import { NotificationsPage } from "./NotificationsPage";

vi.mock("../api/client", () => ({
  api: {
    notifications: vi.fn(),
    markNotificationRead: vi.fn(),
    dismissNotification: vi.fn(),
    markAllNotificationsRead: vi.fn(),
  },
}));

vi.mock("../hooks/useVaultId", () => ({
  useVaultId: () => "vault-1",
}));

describe("NotificationsPage", () => {
  beforeEach(() => {
    vi.mocked(api.notifications).mockReset();
    vi.mocked(api.markNotificationRead).mockReset();
    vi.mocked(api.dismissNotification).mockReset();
    vi.mocked(api.markAllNotificationsRead).mockReset();
    vi.mocked(api.markNotificationRead).mockResolvedValue({ ok: true });
    vi.mocked(api.dismissNotification).mockResolvedValue({ ok: true });
    vi.mocked(api.markAllNotificationsRead).mockResolvedValue({ ok: true });
  });

  it("lists mixed notifications grouped by day and pages by 25", async () => {
    vi.mocked(api.notifications).mockResolvedValue({
      notifications: [
        {
          id: "n1",
          subject: "Task",
          body: "You have been assigned the task: Site visit",
          target_url: "/objects/user_task__v/records/abc123",
          read: false,
          dismissed: false,
          created_at: "2026-08-31T00:00:00Z",
        },
        {
          id: "n2",
          subject: "Done",
          body: "Your sandbox build demo has completed successfully.",
          read: true,
          dismissed: false,
          created_at: "2026-08-31T01:00:00Z",
        },
      ],
      total: 26,
    });

    render(
      <MemoryRouter>
        <UiProvider>
          <NotificationsPage />
        </UiProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("31 AUG 2026")).toBeInTheDocument();
    });
    expect(api.notifications).toHaveBeenCalledWith("vault-1", "all", 25, 0);
    expect(screen.getByRole("link", { name: "Task" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Site visit" })).toBeInTheDocument();
    expect(screen.getByText("Your sandbox build demo has completed successfully.")).toBeInTheDocument();
    expect(screen.getByText("1-2, of 26")).toBeInTheDocument();
    expect(screen.getByText(/Date Received/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    await waitFor(() => {
      expect(api.notifications).toHaveBeenCalledWith("vault-1", "all", 25, 25);
    });
  });
});
