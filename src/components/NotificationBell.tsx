import { Badge, Button, Empty, Popover, Spin, message } from "antd";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { NotificationItem } from "../api/types";
import { useUi } from "../context/UiContext";
import { displayText } from "../lib/i18n";
import {
  downloadOutboundVpkArtifact,
  parseOutboundVpkDownloadTarget,
} from "../lib/outboundExportDownload";
import {
  notificationBodyText,
  notificationContainsHtml,
  notificationPlainText,
  resolveInAppHref,
  sanitizeNotificationHtml,
  splitTaskInlineLink,
} from "./notificationMessage";

dayjs.extend(relativeTime);

export const POLL_INTERVAL_MS = 30_000;
/** Stop unread-count polls after this long with no pointer/keyboard input. */
export const USER_IDLE_MS = 120_000;
const MESSAGE_COLLAPSE_LEN = 160;

const USER_ACTIVITY_EVENTS = [
  "pointerdown",
  "keydown",
  "touchstart",
  "wheel",
  "scroll",
] as const;

/** Unread-count polling requires a visible tab that is focused or under the pointer. */
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

type NotificationRowProps = {
  item: NotificationItem;
  onNavigate: (target: string) => void;
  onSelect: (item: NotificationItem) => void;
  showLessLabel: string;
  showMoreLabel: string;
};

function NotificationRow({
  item,
  onNavigate,
  onSelect,
  showLessLabel,
  showMoreLabel,
}: NotificationRowProps) {
  const [expanded, setExpanded] = useState(false);
  const rawMessage = notificationBodyText(item);
  const { message, linkLabel } = splitTaskInlineLink(rawMessage, item.target_url);
  const htmlMessage = notificationContainsHtml(message) ? sanitizeNotificationHtml(message) : "";
  const plainMessage = htmlMessage ? notificationPlainText(message) : message;
  const collapsible = plainMessage.length > MESSAGE_COLLAPSE_LEN;
  const collapsedText = collapsible
    ? `${plainMessage.slice(0, MESSAGE_COLLAPSE_LEN - 1).trimEnd()}…`
    : plainMessage;

  function handleContentClick(event: React.MouseEvent<HTMLElement>) {
    const anchor = (event.target as HTMLElement).closest("a");
    if (!anchor) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const target = resolveInAppHref(anchor.getAttribute("href"));
    if (target) {
      onNavigate(target);
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={`notification-dropdown__item${item.read ? "" : " notification-dropdown__item--unread"}`}
      onClick={() => onSelect(item)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(item);
        }
      }}
    >
      <div className="notification-dropdown__message" onClick={handleContentClick}>
        {htmlMessage ? (
          expanded || !collapsible ? (
            <div
              className="notification-dropdown__html"
              dangerouslySetInnerHTML={{ __html: htmlMessage }}
            />
          ) : (
            <span>{collapsedText}</span>
          )
        ) : (
          <span>{expanded || !collapsible ? message : collapsedText}</span>
        )}
        {linkLabel ? (
          <>
            {": "}
            <span className="notification-dropdown__inline-link">{linkLabel}</span>
          </>
        ) : null}
        {collapsible ? (
          <button
            type="button"
            className="notification-dropdown__show-more"
            onClick={(event) => {
              event.stopPropagation();
              setExpanded((value) => !value);
            }}
          >
            {expanded ? showLessLabel : showMoreLabel}
          </button>
        ) : null}
      </div>
      <div className="notification-dropdown__time" title={item.created_at}>
        {dayjs(item.created_at).fromNow()}
      </div>
    </div>
  );
}

export function NotificationBell({ vaultId }: Props) {
  const navigate = useNavigate();
  const { shell } = useUi();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"unread" | "all">("unread");
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshCount = useCallback(async () => {
    try {
      const res = await api.notificationUnreadCount(vaultId);
      setUnreadCount(res.unread_count);
    } catch {
      // ignore polling errors
    }
  }, [vaultId]);

  const markDisplayedAsRead = useCallback(
    async (notifications: NotificationItem[]): Promise<NotificationItem[]> => {
      if (!notifications.some((item) => !item.read)) {
        return notifications;
      }
      try {
        await api.markAllNotificationsRead(vaultId);
        setUnreadCount(0);
        return notifications.map((item) => ({ ...item, read: true }));
      } catch {
        return notifications;
      }
    },
    [vaultId],
  );

  const refreshList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.notifications(vaultId, view);
      const readItems = await markDisplayedAsRead(res.notifications);
      setItems(readItems);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [vaultId, view, markDisplayedAsRead]);

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

  useEffect(() => {
    if (!open) {
      return;
    }
    void refreshList();
  }, [open, refreshList]);

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

  async function handleSelect(item: NotificationItem) {
    const target = item.target_url?.trim();
    if (target) {
      await navigateTarget(target);
    }
  }

  function handleViewAllToggle(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    setView((current) => (current === "unread" ? "all" : "unread"));
  }

  const panel = (
    <div className="notification-dropdown">
      <div className="notification-dropdown__header">
        <strong>{displayText(shell.notifications_aria, "Notifications")}</strong>
        <button type="button" className="notification-dropdown__view-all" onClick={handleViewAllToggle}>
          {view === "unread"
            ? displayText(shell.notifications_view_all, "View all")
            : displayText(shell.notifications_unread_only, "Unread only")}
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
            <NotificationRow
              key={item.id}
              item={item}
              onNavigate={(target) => {
                void navigateTarget(target);
              }}
              onSelect={handleSelect}
              showLessLabel={displayText(shell.notifications_show_less, "Show less")}
              showMoreLabel={displayText(shell.notifications_show_more, "Show more")}
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
      onOpenChange={setOpen}
      arrow={{ pointAtCenter: true }}
      overlayClassName="notification-popover"
    >
      <Badge count={unreadCount} size="small" offset={[-2, 4]}>
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
