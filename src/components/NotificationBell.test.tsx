import { act, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { api } from "../api/client";
import { UiProvider } from "../context/UiContext";
import { NotificationBell, POLL_INTERVAL_MS, pageHasFocus } from "./NotificationBell";

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

  it("is true only when the tab is visible and the document has focus", () => {
    setPageFocus({ visible: true, focused: true });
    expect(pageHasFocus()).toBe(true);

    setPageFocus({ visible: true, focused: false });
    expect(pageHasFocus()).toBe(false);

    setPageFocus({ visible: false, focused: true });
    expect(pageHasFocus()).toBe(false);
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
    });

    await waitFor(() => {
      expect(api.notificationUnreadCount).toHaveBeenCalledTimes(2);
    });
  });
});
