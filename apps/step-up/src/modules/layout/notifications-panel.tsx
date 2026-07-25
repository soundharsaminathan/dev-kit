import { Icon } from "@dev-ui/icons";
import styles from "./app-header.module.scss";
import type { ShellVariant } from "./nav-config";
import {
  type NotificationDestination,
  resolveNotificationDestination,
} from "./notification-links";
import { NotificationPreferencesPanel } from "./notification-preferences";

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  meta?: unknown;
  deepLink?: string | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationsPanelProps = {
  items: NotificationItem[];
  loading: boolean;
  connected: boolean;
  variant: ShellVariant;
  unreadCount: number;
  showPreferences: boolean;
  onTogglePreferences: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onOpen: (destination: NotificationDestination) => void;
};

function formatRelative(iso: string) {
  const delta = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function notificationIcon(
  type: string,
):
  | "calendar"
  | "credit-card"
  | "badge-check"
  | "alert-circle"
  | "user"
  | "message-square"
  | "bell" {
  switch (type) {
    case "MISSED_SESSION":
      return "calendar";
    case "PAYMENT_OVERDUE":
      return "credit-card";
    case "RENEWED":
      return "badge-check";
    case "SUBSCRIPTION_EXPIRING":
    case "NOT_RENEWED":
      return "alert-circle";
    case "NEW_FOLLOW":
      return "user";
    case "CHAT_MESSAGE":
      return "message-square";
    default:
      return "bell";
  }
}

export function NotificationsPanel({
  items,
  loading,
  connected,
  variant,
  unreadCount,
  showPreferences,
  onTogglePreferences,
  onMarkRead,
  onMarkAllRead,
  onOpen,
}: NotificationsPanelProps) {
  if (showPreferences) {
    return (
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <div className={styles.panelHeading}>
            <button
              type="button"
              className={styles.headerAction}
              aria-label="Back to notifications"
              onClick={onTogglePreferences}
            >
              <Icon name="chevron-left" />
            </button>
            <div className={styles.panelTitleBlock}>
              <span className={styles.panelTitle}>Preferences</span>
              <span className={styles.panelSubtitle}>Push alerts by type</span>
            </div>
          </div>
        </div>
        <NotificationPreferencesPanel />
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <div className={styles.panelTitleBlock}>
          <span className={styles.panelTitle}>Notifications</span>
          {unreadCount > 0 ? (
            <span className={styles.unreadChip}>{unreadCount} new</span>
          ) : (
            <span className={styles.panelSubtitle}>
              You&apos;re all caught up
            </span>
          )}
        </div>
        <div className={styles.panelActions}>
          <button
            type="button"
            className={styles.headerAction}
            aria-label="Notification preferences"
            onClick={onTogglePreferences}
          >
            <Icon name="settings" />
          </button>
          {unreadCount > 0 ? (
            <button
              type="button"
              className={styles.headerAction}
              aria-label="Mark all as read"
              data-testid="notifications-mark-all-read"
              onClick={onMarkAllRead}
            >
              <Icon name="check-circle" />
            </button>
          ) : null}
        </div>
      </div>

      {!connected ? (
        <div className={styles.statusStrip} data-tone="warn">
          Live updates paused — retrying
        </div>
      ) : null}

      {loading ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>
            <Icon name="bell" />
          </span>
          <span className={styles.emptyTitle}>Loading</span>
          <span className={styles.emptyBody}>
            Fetching your latest updates…
          </span>
        </div>
      ) : items.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>
            <Icon name="bell" />
          </span>
          <span className={styles.emptyTitle}>No notifications yet</span>
          <span className={styles.emptyBody}>
            Class reminders, payments, and social updates will show up here.
          </span>
        </div>
      ) : (
        <ul className={styles.notificationList}>
          {items.map((item) => {
            const destination = resolveNotificationDestination(
              item.type,
              item.meta,
              variant,
            );
            const unread = !item.readAt;

            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={styles.notificationItem}
                  data-unread={unread ? "true" : undefined}
                  data-type={item.type}
                  onClick={() => {
                    if (unread) {
                      onMarkRead(item.id);
                    }
                    if (destination) {
                      onOpen(destination);
                    }
                  }}
                >
                  <span className={styles.notificationIcon} aria-hidden>
                    <Icon name={notificationIcon(item.type)} />
                  </span>
                  <span className={styles.notificationContent}>
                    <span className={styles.notificationTop}>
                      <span className={styles.notificationTitle}>
                        {item.title}
                      </span>
                      <span className={styles.notificationTime}>
                        {formatRelative(item.createdAt)}
                      </span>
                    </span>
                    <span className={styles.notificationBody}>{item.body}</span>
                  </span>
                  {unread ? (
                    <span className={styles.unreadDot} aria-hidden />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
