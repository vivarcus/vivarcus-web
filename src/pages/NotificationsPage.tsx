import { UnorderedListOutlined } from "@ant-design/icons";
import { Empty, Spin, message } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { NotificationItem } from "../api/types";
import { ListActionsMenu } from "../components/ListActionsMenu";
import { ListPagination } from "../components/ListPagination";
import { NotificationItemRow } from "../components/NotificationItemRow";
import { formatNotificationDayHeading } from "../components/notificationMessage";
import { useUi } from "../context/UiContext";
import { useVaultId } from "../hooks/useVaultId";
import { displayText, displayTextTemplate } from "../lib/i18n";
import {
  downloadOutboundVpkArtifact,
  parseOutboundVpkDownloadTarget,
} from "../lib/outboundExportDownload";

export const PAGE_SIZE = 25;

function groupByDay(items: NotificationItem[]): { heading: string; items: NotificationItem[] }[] {
  const groups: { heading: string; items: NotificationItem[] }[] = [];
  for (const item of items) {
    const heading = formatNotificationDayHeading(item.created_at);
    const last = groups[groups.length - 1];
    if (last && last.heading === heading) {
      last.items.push(item);
    } else {
      groups.push({ heading, items: [item] });
    }
  }
  return groups;
}

export function NotificationsPage() {
  const vaultId = useVaultId();
  const navigate = useNavigate();
  const { shell } = useUi();
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!vaultId) {
      return;
    }
    setLoading(true);
    try {
      const res = await api.notifications(vaultId, "all", PAGE_SIZE, (page - 1) * PAGE_SIZE);
      setItems(res.notifications);
      setTotal(res.total ?? res.notifications.length);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [vaultId, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo(() => groupByDay(items), [items]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = items.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = (page - 1) * PAGE_SIZE + items.length;
  const hasUnread = items.some((item) => !item.read);

  async function navigateTarget(target: string) {
    const download = parseOutboundVpkDownloadTarget(target);
    if (download && vaultId) {
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
    if (!vaultId || item.read) {
      return;
    }
    try {
      await api.markNotificationRead(vaultId, item.id);
      setItems((current) =>
        current.map((row) => (row.id === item.id ? { ...row, read: true } : row)),
      );
    } catch {
      // keep current unread state
    }
  }

  async function handleDismiss(item: NotificationItem) {
    if (!vaultId) {
      return;
    }
    try {
      await api.dismissNotification(vaultId, item.id);
      setItems((current) => current.filter((row) => row.id !== item.id));
      setTotal((count) => Math.max(0, count - 1));
    } catch {
      // keep the row
    }
  }

  async function handleMarkAllRead() {
    if (!vaultId) {
      return;
    }
    try {
      await api.markAllNotificationsRead(vaultId);
      setItems((current) => current.map((row) => ({ ...row, read: true })));
    } catch {
      // keep current unread state
    }
  }

  return (
    <div className="list-page notifications-page">
      <aside className="list-page__sidebar">
        <section className="sidebar-section">
          <h2 className="sidebar-section__title">{displayText(shell.notifications_views, "Views")}</h2>
          <div className="view-tabs" role="tablist" aria-label={displayText(shell.notifications_views, "Views")}>
            <button
              type="button"
              role="tab"
              aria-selected="true"
              className="view-tab view-tab--active"
            >
              <span className="view-tab__icon" aria-hidden>
                <UnorderedListOutlined />
              </span>
              <span className="view-tab__label">{displayText(shell.notifications_all, "All Notifications")}</span>
            </button>
          </div>
        </section>
      </aside>
      <section className="list-page__content">
        <h1 className="notifications-page__title">
          {displayText(shell.notifications_all, "All Notifications")}
        </h1>
        <div className="list-toolbar">
          <div className="list-toolbar__start">
            <span className="list-toolbar__sort" aria-hidden="false">
              ↓ {displayText(shell.notifications_sort_date, "Date Received")}
            </span>
          </div>
          <div className="list-toolbar__end">
            {total > 0 ? (
              <ListPagination
                rangeLabel={displayTextTemplate(
                  shell.notifications_pagination_range,
                  { start: rangeStart, end: rangeEnd, total },
                  "{start}-{end}, of {total}",
                )}
                currentPage={page}
                totalPages={totalPages}
                hasPrevious={page > 1}
                hasNext={page < totalPages}
                loading={loading}
                previousAria={displayText(shell.notifications_previous_page, "Previous page")}
                nextAria={displayText(shell.notifications_next_page, "Next page")}
                pageInputAria={displayText(shell.notifications_page_input, "Page number")}
                onPrevious={() => setPage((current) => Math.max(1, current - 1))}
                onNext={() => setPage((current) => current + 1)}
                onGoToPage={setPage}
              />
            ) : null}
            <ListActionsMenu
              ariaLabel={displayText(shell.notifications_list_actions, "List actions")}
              disabled={loading || items.length === 0}
            >
              {(close) => (
                <button
                  type="button"
                  role="menuitem"
                  className="list-actions-menu__item"
                  disabled={!hasUnread}
                  onClick={() => {
                    close();
                    void handleMarkAllRead();
                  }}
                >
                  {displayText(shell.notifications_mark_all_read, "Mark All as Read")}
                </button>
              )}
            </ListActionsMenu>
          </div>
        </div>
        {loading ? (
          <div className="notifications-page__loading">
            <Spin />
          </div>
        ) : null}
        {!loading && items.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={displayText(shell.notifications_empty, "No notifications")}
          />
        ) : null}
        {!loading && items.length > 0 ? (
          <div className="notifications-page__feed">
            {groups.map((group) => (
              <div key={group.heading} className="notifications-page__group">
                <div className="notifications-page__day">{group.heading}</div>
                {group.items.map((item) => (
                  <NotificationItemRow
                    key={item.id}
                    item={item}
                    layout="page"
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
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
