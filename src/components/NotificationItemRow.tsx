import { DeleteOutlined, MailOutlined, UserOutlined } from "@ant-design/icons";
import { useState } from "react";
import type { NotificationItem } from "../api/types";
import {
  embedRecordLink,
  formatNotificationTime,
  notificationBodyText,
  notificationHeading,
  notificationNeedsCollapse,
  prepareNotificationHtml,
  resolveInAppHref,
} from "./notificationMessage";

export type NotificationItemRowProps = {
  item: NotificationItem;
  onNavigate: (target: string) => void;
  onMarkRead: (item: NotificationItem) => void;
  onDismiss: (item: NotificationItem) => void;
  showMoreLabel: string;
  markReadLabel: string;
  deleteLabel: string;
  layout?: "dropdown" | "page";
};

export function NotificationItemRow({
  item,
  onNavigate,
  onMarkRead,
  onDismiss,
  showMoreLabel,
  markReadLabel,
  deleteLabel,
  layout = "dropdown",
}: NotificationItemRowProps) {
  const [expanded, setExpanded] = useState(false);
  const rawMessage = embedRecordLink(notificationBodyText(item), item.target_url);
  const preparedHtml = prepareNotificationHtml(rawMessage);
  const collapsible = notificationNeedsCollapse(rawMessage);
  const heading = layout === "page" ? notificationHeading(item) : undefined;
  const headingHref = heading ? resolveInAppHref(item.target_url) : null;

  function openTarget(target: string) {
    if (!item.read) {
      onMarkRead(item);
    }
    onNavigate(target);
  }

  function handleContentClick(event: React.MouseEvent<HTMLElement>) {
    const anchor = (event.target as HTMLElement).closest("a");
    if (!anchor) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const target = resolveInAppHref(anchor.getAttribute("href"));
    if (target) {
      openTarget(target);
    }
  }

  return (
    <div
      className={`notification-item${item.read ? "" : " notification-item--unread"}${
        layout === "page" ? " notification-item--page" : ""
      }`}
    >
      {layout === "page" ? (
        <div className="notification-item__avatar" aria-hidden>
          <UserOutlined />
        </div>
      ) : (
        <div className="notification-item__badge" aria-hidden />
      )}
      <div className="notification-item__body">
        {heading ? (
          headingHref ? (
            <a
              className="notification-item__subject"
              href={headingHref}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                openTarget(headingHref);
              }}
            >
              {heading}
            </a>
          ) : (
            <div className="notification-item__subject">{heading}</div>
          )
        ) : null}
        <div className="notification-item__message" onClick={handleContentClick}>
          {preparedHtml ? (
            <div
              className={`notification-item__html${
                collapsible && !expanded ? " notification-item__html--collapsed" : ""
              }`}
              dangerouslySetInnerHTML={{ __html: preparedHtml }}
            />
          ) : (
            <span>{rawMessage}</span>
          )}
        </div>
        {collapsible && !expanded ? (
          <button
            type="button"
            className="notification-item__show-more"
            onClick={(event) => {
              event.stopPropagation();
              setExpanded(true);
            }}
          >
            {showMoreLabel}
          </button>
        ) : null}
        <div className="notification-item__time" title={item.created_at}>
          {formatNotificationTime(item.created_at)}
        </div>
      </div>
      <div className="notification-item__actions">
        {!item.read ? (
          <button
            type="button"
            className="notification-item__action"
            aria-label={markReadLabel}
            title={markReadLabel}
            onClick={(event) => {
              event.stopPropagation();
              onMarkRead(item);
            }}
          >
            <MailOutlined />
          </button>
        ) : null}
        <button
          type="button"
          className="notification-item__action"
          aria-label={deleteLabel}
          title={deleteLabel}
          onClick={(event) => {
            event.stopPropagation();
            onDismiss(item);
          }}
        >
          <DeleteOutlined />
        </button>
      </div>
    </div>
  );
}
