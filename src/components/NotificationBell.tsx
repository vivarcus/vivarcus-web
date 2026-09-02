import { Badge, Button, Empty, Popover, Spin, message } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { NotificationItem } from "../api/types";
import { useUi } from "../context/UiContext";
import { displayText } from "../lib/i18n";
import {
  downloadOutboundVpkArtifact,
  parseOutboundVpkDownloadTarget,
} from "../lib/outboundExportDownload";
import { NotificationItemRow } from "./NotificationItemRow";

export const POLL_INTERVAL_MS = 30_000;
/** Stop new-count polls after this long with no pointer/keyboard input. */
export const USER_IDLE_MS = 120_000;
export const DROPDOWN_LIMIT = 25;

const USER_ACTIVITY_EVENTS = [
  "pointerdown",
  "keydown",
  "touchstart",
  "wheel",
  "scroll",
] as const;

/** New-count polling requires a visible tab that is focused or under the pointer. */
export function pageHasFocus(pointerOverPage = false): boolean {
  return document.visibilityState === "visible" && (document.hasFocus() || pointerOverPage);
}

/** True while the tab is present and the user has interacted recently. */
export function pageAllowsPolling(
  lastActivityAt: number,
  now = Date.now(),
  pointerOverPage = false,
): boolean {
  return pageHasFocus(pointerOverPage) && now - lastActivityAt < USER_IDLE_MS;
}

type Props = {
  vaultId: string;
};

export function NotificationBell({ vaultId }: Props) {
  const navigate = useNavigate();
  const { shell } = useUi();
  const [open, setOpen] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const seenEpochRef = useRef(0);

  const refreshCount = useCallback(async () => {
    const epoch = seenEpochRef.current;
    try {
      const res = await api.notificationUnreadCount(vaultId);
      if (epoch !== seenEpochRef.current) {
        return;
      }
      setNewCount(res.new_count);
    } catch {
      // ignore polling errors
    }
  }, [vaultId]);

  const refreshList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.notifications(vaultId, "all", DROPDOWN_LIMIT);
      setItems(res.notifications);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [vaultId]);

  useEffect(() => {
    let timer: number | undefined;
    let idleTimer: number | undefined;
    let polling = false;
    let pointerOverPage = false;
    let lastActivityAt = Date.now();

    const stop = () => {
      if (timer !== undefined) {
        window.clearInterval(timer);
        timer = undefined;
      }
      if (idleTimer !== undefined) {
        window.clearTimeout(idleTimer);
        idleTimer = undefined;
      }
      polling = false;
    };

    const armIdleTimer = () => {
      if (idleTimer !== undefined) {
        window.clearTimeout(idleTimer);
      }
      const remaining = USER_IDLE_MS - (Date.now() - lastActivityAt);
      idleTimer = window.setTimeout(() => {
        sync();
      }, Math.max(remaining, 0));
    };

    const start = () => {
      if (polling) {
        return;
      }
      polling = true;
      void refreshCount();
      timer = window.setInterval(() => {
        if (!pageAllowsPolling(lastActivityAt, Date.now(), pointerOverPage)) {
          stop();
          return;
        }
        void refreshCount();
      }, POLL_INTERVAL_MS);
      armIdleTimer();
    };

    const sync = () => {
      if (pageAllowsPolling(lastActivityAt, Date.now(), pointerOverPage)) {
        start();
        armIdleTimer();
      } else {
        stop();
      }
    };

    const onUserActivity = () => {
      lastActivityAt = Date.now();
      sync();
    };

    const onPointerEnter = () => {
      pointerOverPage = true;
      lastActivityAt = Date.now();
      sync();
    };

    const onPointerLeave = () => {
      pointerOverPage = false;
      sync();
    };

    sync();
    window.addEventListener("focus", sync);
    window.addEventListener("blur", sync);
    window.addEventListener("pageshow", sync);
    document.addEventListener("visibilitychange", sync);
    document.documentElement.addEventListener("pointerenter", onPointerEnter);
    document.documentElement.addEventListener("pointerleave", onPointerLeave);
    for (const event of USER_ACTIVITY_EVENTS) {
      window.addEventListener(event, onUserActivity, { passive: true, capture: true });
    }
    return () => {
      stop();
      window.removeEventListener("focus", sync);
      window.removeEventListener("blur", sync);
      window.removeEventListener("pageshow", sync);
      document.removeEventListener("visibilitychange", sync);
      document.documentElement.removeEventListener("pointerenter", onPointerEnter);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
      for (const event of USER_ACTIVITY_EVENTS) {
        window.removeEventListener(event, onUserActivity, { capture: true });
      }
    };
  }, [refreshCount]);

  async function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      return;
    }
    seenEpochRef.current += 1;
    setNewCount(0);
    try {
      await refreshList();
      await api.markNotificationsSeen(vaultId);
      seenEpochRef.current += 1;
    } catch {
      void refreshCount();
    }
  }

  async function navigateTarget(target: string) {
    setOpen(false);
    const download = parseOutboundVpkDownloadTarget(target);
    if (download) {
      try {
        await downloadOutboundVpkArtifact(vaultId, download.artifactId, "package.vpk");
        message.success(displayText(shell.notifications_download_started, "Download started"));
      } catch (err) {
        message.error(
          err instanceof Error
            ? err.message
            : displayText(shell.notifications_download_failed, "Download failed"),
        );
      }
      return;
    }
    navigate(target);
  }

  async function handleMarkRead(item: NotificationItem) {
    if (item.read) {
      return;
    }
    try {
      await api.markNotificationRead(vaultId, item.id);
      setItems((current) =>
        current.map((row) => (row.id === item.id ? { ...row, read: true, new: false } : row)),
      );
      if (item.new) {
        setNewCount((count) => Math.max(0, count - 1));
      }
    } catch {
      // keep current unread state
    }
  }

  async function handleDismiss(item: NotificationItem) {
    try {
      await api.dismissNotification(vaultId, item.id);
      setItems((current) => current.filter((row) => row.id !== item.id));
      if (item.new) {
        setNewCount((count) => Math.max(0, count - 1));
      }
    } catch {
      // keep the row
    }
  }

  function handleViewAll(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    setOpen(false);
    navigate("/notifications");
  }

  const panel = (
    <div className="notification-dropdown">
      <div className="notification-dropdown__header">
        <strong>{displayText(shell.notifications_aria, "Notifications")}</strong>
        <button type="button" className="notification-dropdown__view-all" onClick={handleViewAll}>
          {displayText(shell.notifications_view_all, "View all")}
        </button>
      </div>
      {loading ? (
        <div className="notification-dropdown__loading">
          <Spin size="small" />
        </div>
      ) : null}
      {!loading && items.length === 0 ? (
        <div className="notification-dropdown__empty">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={displayText(shell.notifications_empty, "No notifications")}
          />
        </div>
      ) : null}
      {!loading && items.length > 0 ? (
        <div className="notification-dropdown__list">
          {items.map((item) => (
            <NotificationItemRow
              key={item.id}
              item={item}
              onNavigate={(target) => {
                void navigateTarget(target);
              }}
              onMarkRead={(row) => {
                void handleMarkRead(row);
              }}
              onDismiss={(row) => {
                void handleDismiss(row);
              }}
              showMoreLabel={displayText(shell.notifications_show_more, "Show more")}
              markReadLabel={displayText(shell.notifications_mark_read, "Mark as read")}
              deleteLabel={displayText(shell.notifications_delete, "Delete")}
            />
          ))}
        </div>
      ) : null}
    </div>
  );

  return (
    <Popover
      content={panel}
      trigger="click"
      placement="bottomRight"
      open={open}
      onOpenChange={(next) => {
        void handleOpenChange(next);
      }}
      arrow={{ pointAtCenter: true }}
      overlayClassName="notification-popover"
    >
      <Badge count={newCount} size="small" offset={[-2, 4]}>
        <Button
          type="text"
          className="header-menus__icon-btn header-menus__icon-btn--notifications"
          aria-label={displayText(shell.notifications_aria, "Notifications")}
          title={displayText(shell.notifications_aria, "Notifications")}
        />
      </Badge>
    </Popover>
  );
}
