import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import { api } from "../api/client";
import { UiProvider } from "../context/UiContext";
import {
  NotificationBell,
  POLL_INTERVAL_MS,
  USER_IDLE_MS,
  pageAllowsPolling,
  pageHasFocus,
} from "./NotificationBell";

vi.mock("../api/client", () => ({
  api: {
    notificationUnreadCount: vi.fn(),
    notifications: vi.fn(),
    markAllNotificationsRead: vi.fn(),
    markNotificationsSeen: vi.fn(),
    markNotificationRead: vi.fn(),
    dismissNotification: vi.fn(),
  },
}));

function setPageFocus({ visible, focused }: { visible: boolean; focused: boolean }) {
  Object.defineProperty(document, "hidden", {
    configurable: true,
    get: () => !visible,
  });
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => (visible ? "visible" : "hidden"),
  });
  vi.spyOn(document, "hasFocus").mockReturnValue(focused);
}

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderBell() {
  return render(
    <MemoryRouter>
      <UiProvider>
        <NotificationBell vaultId="vault-1" />
        <LocationProbe />
      </UiProvider>
    </MemoryRouter>,
  );
}

describe("pageHasFocus", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is true when the tab is visible and focused, or the pointer is over the page", () => {
    setPageFocus({ visible: true, focused: true });
    expect(pageHasFocus()).toBe(true);

    setPageFocus({ visible: true, focused: false });
    expect(pageHasFocus()).toBe(false);
    expect(pageHasFocus(true)).toBe(true);

    setPageFocus({ visible: false, focused: true });
    expect(pageHasFocus()).toBe(false);
    expect(pageHasFocus(true)).toBe(false);
  });
});

describe("pageAllowsPolling", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requires focus and recent user activity", () => {
    setPageFocus({ visible: true, focused: true });
    const now = 1_000_000;
    expect(pageAllowsPolling(now - USER_IDLE_MS + 1, now)).toBe(true);
    expect(pageAllowsPolling(now - USER_IDLE_MS, now)).toBe(false);

    setPageFocus({ visible: true, focused: false });
    expect(pageAllowsPolling(now, now)).toBe(false);
    expect(pageAllowsPolling(now, now, true)).toBe(true);
  });
});

describe("NotificationBell message rendering", () => {
  beforeEach(() => {
    vi.mocked(api.notificationUnreadCount).mockReset();
    vi.mocked(api.notifications).mockReset();
    vi.mocked(api.markAllNotificationsRead).mockReset();
    vi.mocked(api.markNotificationsSeen).mockReset();
    vi.mocked(api.markNotificationRead).mockReset();
    vi.mocked(api.dismissNotification).mockReset();
    vi.mocked(api.notificationUnreadCount).mockResolvedValue({ unread_count: 1, new_count: 1 });
    vi.mocked(api.markAllNotificationsRead).mockResolvedValue({ ok: true });
    vi.mocked(api.markNotificationsSeen).mockResolvedValue({ ok: true });
    vi.mocked(api.markNotificationRead).mockResolvedValue({ ok: true });
    vi.mocked(api.dismissNotification).mockResolvedValue({ ok: true });
    setPageFocus({ visible: true, focused: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders notification links as anchors instead of raw html", async () => {
    vi.mocked(api.notifications).mockResolvedValue({
      notifications: [
        {
          id: "n1",
          subject: "Notification: Sandbox Build Complete",
          body: '您的 Sandbox 构建 demo 已成功完成。打开 <a href="/admin/deployment/sandbox_vaults">Sandbox Vaults</a>。',
          target_url: "/admin/deployment/sandbox_vaults",
          read: false,
          dismissed: false,
          created_at: "2026-08-31T00:00:00Z",
        },
      ],
    });

    renderBell();
    const bell = document.querySelector(".header-menus__icon-btn--notifications");
    expect(bell).toBeTruthy();
    fireEvent.click(bell!);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Sandbox Vaults" })).toBeInTheDocument();
    });
    expect(screen.queryByText(/<a href=/)).not.toBeInTheDocument();
  });

  it("renders entity-escaped notification links as anchors", async () => {
    vi.mocked(api.notifications).mockResolvedValue({
      notifications: [
        {
          id: "n2",
          subject: "Notification: Sandbox Build Complete",
          body: '打开 &lt;a href="/admin/deployment/sandbox_vaults"&gt;Sandbox Vaults&lt;/a&gt;。',
          target_url: "/admin/deployment/sandbox_vaults",
          read: false,
          dismissed: false,
          created_at: "2026-08-31T00:00:00Z",
        },
      ],
    });

    renderBell();
    const bell = document.querySelector(".header-menus__icon-btn--notifications");
    fireEvent.click(bell!);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Sandbox Vaults" })).toBeInTheDocument();
    });
  });

  it("clears the new-count badge when the dropdown opens without marking all read", async () => {
    vi.mocked(api.notifications).mockResolvedValue({
      notifications: [
        {
          id: "n3",
          subject: "Task",
          body: "You have been assigned the task: Site visit",
          target_url: "/objects/user_task__v/records/abc123",
          read: false,
          new: true,
          dismissed: false,
          created_at: "2026-08-31T00:00:00Z",
        },
      ],
      total: 1,
    });

    renderBell();
    await waitFor(() => {
      expect(document.querySelector(".ant-badge-count")).toBeTruthy();
    });
    fireEvent.click(document.querySelector(".header-menus__icon-btn--notifications")!);

    await waitFor(() => {
      expect(api.notifications).toHaveBeenCalled();
    });
    expect(api.notifications).toHaveBeenCalledWith("vault-1", "all", 25);
    await waitFor(() => {
      expect(api.markNotificationsSeen).toHaveBeenCalledWith("vault-1");
    });
    expect(api.markAllNotificationsRead).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(document.querySelector(".ant-badge-count")).toBeNull();
    });
  });

  it("marks one notification read from the row action", async () => {
    vi.mocked(api.notifications).mockResolvedValue({
      notifications: [
        {
          id: "n4",
          subject: "Task",
          body: "You have been assigned the task: Site visit",
          target_url: "/objects/user_task__v/records/abc123",
          read: false,
          dismissed: false,
          created_at: "2026-08-31T00:00:00Z",
        },
      ],
      total: 1,
    });

    renderBell();
    fireEvent.click(document.querySelector(".header-menus__icon-btn--notifications")!);
    const markRead = await screen.findByRole("button", { name: "Mark as read" });
    fireEvent.click(markRead);
    await waitFor(() => {
      expect(api.markNotificationRead).toHaveBeenCalledWith("vault-1", "n4");
    });
  });

  it("dismisses one notification from the row action", async () => {
    vi.mocked(api.notifications).mockResolvedValue({
      notifications: [
        {
          id: "n5",
          subject: "Task",
          body: "You have been assigned the task: Site visit",
          target_url: "/objects/user_task__v/records/abc123",
          read: false,
          dismissed: false,
          created_at: "2026-08-31T00:00:00Z",
        },
      ],
      total: 1,
    });

    renderBell();
    fireEvent.click(document.querySelector(".header-menus__icon-btn--notifications")!);
    const remove = await screen.findByRole("button", { name: "Delete" });
    fireEvent.click(remove);
    await waitFor(() => {
      expect(api.dismissNotification).toHaveBeenCalledWith("vault-1", "n5");
    });
  });

  it("navigates to the notifications page from View all", async () => {
    vi.mocked(api.notifications).mockResolvedValue({ notifications: [], total: 0 });

    renderBell();
    fireEvent.click(document.querySelector(".header-menus__icon-btn--notifications")!);
    fireEvent.click(await screen.findByRole("button", { name: "View all" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/notifications");
  });
});

describe("NotificationBell unread-count polling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(api.notificationUnreadCount).mockReset();
    vi.mocked(api.notificationUnreadCount).mockResolvedValue({ unread_count: 0, new_count: 0 });
    setPageFocus({ visible: true, focused: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("polls while focused and stops after blur", async () => {
    renderBell();

    await act(async () => {
      await Promise.resolve();
    });
    expect(api.notificationUnreadCount).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(POLL_INTERVAL_MS);
    });
    expect(api.notificationUnreadCount).toHaveBeenCalledTimes(2);

    setPageFocus({ visible: true, focused: false });
    await act(async () => {
      window.dispatchEvent(new Event("blur"));
    });

    await act(async () => {
      vi.advanceTimersByTime(POLL_INTERVAL_MS * 2);
    });
    expect(api.notificationUnreadCount).toHaveBeenCalledTimes(2);
  });

  it("stops polling when the tab is hidden and fetches once on focus return", async () => {
    renderBell();

    await act(async () => {
      await Promise.resolve();
    });
    expect(api.notificationUnreadCount).toHaveBeenCalledTimes(1);

    setPageFocus({ visible: false, focused: false });
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await act(async () => {
      vi.advanceTimersByTime(POLL_INTERVAL_MS * 2);
    });
    expect(api.notificationUnreadCount).toHaveBeenCalledTimes(1);

    setPageFocus({ visible: true, focused: true });
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      window.dispatchEvent(new Event("focus"));
      await Promise.resolve();
    });
    expect(api.notificationUnreadCount).toHaveBeenCalledTimes(2);
  });

  it("stops polling after user idle while the tab stays focused", async () => {
    renderBell();

    await act(async () => {
      await Promise.resolve();
    });
    expect(api.notificationUnreadCount).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(POLL_INTERVAL_MS);
    });
    expect(api.notificationUnreadCount).toHaveBeenCalledTimes(2);

    await act(async () => {
      vi.advanceTimersByTime(USER_IDLE_MS - POLL_INTERVAL_MS);
    });
    const callsAfterIdle = vi.mocked(api.notificationUnreadCount).mock.calls.length;

    await act(async () => {
      vi.advanceTimersByTime(POLL_INTERVAL_MS * 3);
    });
    expect(api.notificationUnreadCount).toHaveBeenCalledTimes(callsAfterIdle);
  });

  it("fetches unread-count when the pointer re-enters an unfocused page", async () => {
    renderBell();

    await act(async () => {
      await Promise.resolve();
    });
    expect(api.notificationUnreadCount).toHaveBeenCalledTimes(1);

    setPageFocus({ visible: true, focused: false });
    await act(async () => {
      window.dispatchEvent(new Event("blur"));
    });

    await act(async () => {
      vi.advanceTimersByTime(POLL_INTERVAL_MS * 2);
    });
    expect(api.notificationUnreadCount).toHaveBeenCalledTimes(1);

    await act(async () => {
      document.documentElement.dispatchEvent(new Event("pointerenter"));
      await Promise.resolve();
    });
    expect(api.notificationUnreadCount).toHaveBeenCalledTimes(2);

    await act(async () => {
      vi.advanceTimersByTime(POLL_INTERVAL_MS);
    });
    expect(api.notificationUnreadCount).toHaveBeenCalledTimes(3);

    await act(async () => {
      document.documentElement.dispatchEvent(new Event("pointerleave"));
    });

    await act(async () => {
      vi.advanceTimersByTime(POLL_INTERVAL_MS * 2);
    });
    expect(api.notificationUnreadCount).toHaveBeenCalledTimes(3);
  });

  it("resumes polling after idle when the user interacts again", async () => {
    renderBell();

    await act(async () => {
      await Promise.resolve();
    });
    expect(api.notificationUnreadCount).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(USER_IDLE_MS);
    });
    const callsAfterIdle = vi.mocked(api.notificationUnreadCount).mock.calls.length;

    await act(async () => {
      window.dispatchEvent(new Event("pointerdown"));
      await Promise.resolve();
    });
    expect(api.notificationUnreadCount).toHaveBeenCalledTimes(callsAfterIdle + 1);

    await act(async () => {
      vi.advanceTimersByTime(POLL_INTERVAL_MS);
    });
    expect(api.notificationUnreadCount).toHaveBeenCalledTimes(callsAfterIdle + 2);
  });
});
