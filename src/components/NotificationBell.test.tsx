import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
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

function renderBell() {
  return render(
    <MemoryRouter>
      <UiProvider>
        <NotificationBell vaultId="vault-1" />
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

describe("NotificationBell unread-count polling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(api.notificationUnreadCount).mockReset();
    vi.mocked(api.notificationUnreadCount).mockResolvedValue({ unread_count: 0 });
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
