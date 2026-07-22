import { Avatar, AvatarFallback, AvatarImage } from "@dev-ui/components/avatar";
import { Button } from "@dev-ui/components/button";
import { Drawer, DrawerHandle } from "@dev-ui/components/drawer";
import { Text } from "@dev-ui/components/text";
import { useIsMobile } from "@dev-ui/hooks";
import { Icon } from "@dev-ui/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import {
  notificationsListKey,
  notificationsUnreadKey,
  publishNotificationBroadcast,
} from "@/lib/notifications-cache";
import { useNotificationsSocket } from "@/lib/notifications-socket-provider";
import {
  TooltipIconBar,
  TooltipIconBarItem,
} from "@/modules/ui/tooltip-icon-bar";
import styles from "./app-header.module.scss";
import {
  getHeaderNavLinks,
  getProfilePath,
  type ShellVariant,
} from "./nav-config";
import {
  type NotificationDestination,
  resolveNotificationDestination,
} from "./notification-links";
import { NotificationPreferencesPanel } from "./notification-preferences";

type AppHeaderProps = {
  variant: ShellVariant;
};

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  meta?: unknown;
  deepLink?: string | null;
  readAt: string | null;
  createdAt: string;
};

type NotificationsPage = {
  items: NotificationItem[];
  nextCursor: string | null;
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
    case "PLAN_EXPIRING":
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

function NotificationsPanel({
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
}: {
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
}) {
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

function NotificationsControl({
  variant,
  tone = "default",
}: {
  variant: ShellVariant;
  tone?: "default" | "onMedia";
}) {
  const api = useApi();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { connected } = useNotificationsSocket();
  const [open, setOpen] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const query = useQuery({
    queryKey: notificationsListKey(user?.id),
    queryFn: () => api.get<NotificationsPage>("/notifications?limit=40"),
    enabled: Boolean(user),
    refetchInterval: connected ? false : 30_000,
  });

  const unreadQuery = useQuery({
    queryKey: notificationsUnreadKey(user?.id),
    queryFn: () => api.get<{ count: number }>("/notifications/unread-count"),
    enabled: Boolean(user),
    refetchInterval: connected ? false : 30_000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      const previousList = queryClient.getQueryData<NotificationsPage>(
        notificationsListKey(user?.id),
      );
      const previousUnread = queryClient.getQueryData<{ count: number }>(
        notificationsUnreadKey(user?.id),
      );
      queryClient.setQueryData(
        notificationsListKey(user?.id),
        (current: NotificationsPage | undefined) => {
          if (!current) return current;
          return {
            ...current,
            items: current.items.map((item) =>
              item.id === id
                ? { ...item, readAt: new Date().toISOString() }
                : item,
            ),
          };
        },
      );
      if (previousUnread && previousUnread.count > 0) {
        queryClient.setQueryData(notificationsUnreadKey(user?.id), {
          count: previousUnread.count - 1,
        });
      }
      publishNotificationBroadcast({
        type: "invalidate",
        userId: user!.id,
      });
      return { previousList, previousUnread };
    },
    onError: (_error, _id, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(
          notificationsListKey(user?.id),
          context.previousList,
        );
      }
      if (context?.previousUnread) {
        queryClient.setQueryData(
          notificationsUnreadKey(user?.id),
          context.previousUnread,
        );
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => api.post("/notifications/mark-all-read"),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      publishNotificationBroadcast({
        type: "invalidate",
        userId: user!.id,
      });
    },
  });

  const items = query.data?.items ?? [];
  const unreadCount = unreadQuery.data?.count ?? 0;

  useEffect(() => {
    if (!open || isMobile) return;

    function onPointerDown(event: PointerEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, isMobile]);

  const openDestination = (destination: NotificationDestination) => {
    setOpen(false);
    void navigate(destination);
  };

  const panel = (
    <NotificationsPanel
      items={items}
      loading={query.isLoading}
      connected={connected}
      variant={variant}
      unreadCount={unreadCount}
      showPreferences={showPreferences}
      onTogglePreferences={() => setShowPreferences((value) => !value)}
      onMarkRead={(id) => markRead.mutate(id)}
      onMarkAllRead={() => markAllRead.mutate()}
      onOpen={openDestination}
    />
  );

  const notificationsLabel =
    unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications";

  return (
    <div
      className={styles.control}
      ref={panelRef}
      data-tone={tone === "onMedia" ? "onMedia" : undefined}
    >
      <TooltipIconBarItem label="Notifications">
        <Button
          variant="quiet"
          isIconOnly
          aria-label={notificationsLabel}
          aria-expanded={open}
          className={tone === "onMedia" ? styles.onMediaButton : undefined}
          onClick={() => {
            setShowPreferences(false);
            setOpen((value) => !value);
          }}
        >
          <Icon name="bell" />
          {unreadCount > 0 ? (
            <span className={styles.badge} aria-hidden>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </TooltipIconBarItem>

      {!isMobile && open ? (
        <div
          className={styles.dropdown}
          role="dialog"
          aria-label="Notifications"
        >
          {panel}
        </div>
      ) : null}

      <Drawer
        placement="bottom"
        isOpen={isMobile && open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setShowPreferences(false);
          }
        }}
      >
        <DrawerHandle />
        <div className={styles.drawerBody}>{panel}</div>
      </Drawer>
    </div>
  );
}

function ProfileControl({ variant }: { variant: ShellVariant }) {
  const { user, signOutUser } = useAuth();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const profilePath = getProfilePath(variant);

  useEffect(() => {
    if (!open || isMobile) return;

    function onPointerDown(event: PointerEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, isMobile]);

  const menu = (
    <>
      <Link
        to={profilePath}
        className={styles.menuLink}
        role="menuitem"
        onClick={() => setOpen(false)}
      >
        <Icon name="user" />
        Profile
      </Link>
      <Link
        to="/studio"
        className={styles.menuLink}
        role="menuitem"
        onClick={() => setOpen(false)}
      >
        <Icon name="external-link" />
        View studio
      </Link>
      <button
        type="button"
        className={styles.menuLink}
        role="menuitem"
        onClick={() => {
          setOpen(false);
          void signOutUser();
        }}
      >
        <Icon name="log-out" />
        Sign out
      </button>
    </>
  );

  return (
    <div className={styles.control} ref={panelRef}>
      <TooltipIconBarItem label="Account">
        <Button
          variant="quiet"
          aria-label="Account menu"
          aria-expanded={open}
          className={styles.profileTrigger}
          onClick={() => setOpen((value) => !value)}
        >
          <Avatar size="sm">
            {user?.photoUrl ? (
              <AvatarImage src={user.photoUrl} alt={user.name} />
            ) : null}
            <AvatarFallback>
              <Icon name="user" />
            </AvatarFallback>
          </Avatar>
          <span className={styles.profileName}>{user?.name ?? "Account"}</span>
        </Button>
      </TooltipIconBarItem>

      {!isMobile && open ? (
        <div className={styles.dropdown} role="menu" aria-label="Account">
          {menu}
        </div>
      ) : null}

      <Drawer
        placement="bottom"
        isOpen={isMobile && open}
        onOpenChange={setOpen}
      >
        <DrawerHandle />
        <div className={styles.drawerBody}>
          <div className={styles.panelHeader}>
            <Text>Account</Text>
          </div>
          {menu}
        </div>
      </Drawer>
    </div>
  );
}

export { NotificationsControl };

export function AppHeader({ variant }: AppHeaderProps) {
  const headerLinks = getHeaderNavLinks(variant);
  const isMobile = useIsMobile();

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <Text className={styles.brandLabel}>Step Up</Text>
      </div>
      <TooltipIconBar
        placement="bottom"
        disabled={isMobile}
        className={styles.actions ?? ""}
      >
        {headerLinks.map((link) => (
          <TooltipIconBarItem key={link.to} label={link.label}>
            <Link
              to={link.to}
              className={styles.navIcon}
              aria-label={link.label}
              activeOptions={{ exact: link.exact ?? false }}
              activeProps={{
                className: `${styles.navIcon} ${styles.navIconActive}`,
              }}
            >
              <Icon name={link.icon} />
            </Link>
          </TooltipIconBarItem>
        ))}
        <NotificationsControl variant={variant} />
        <ProfileControl variant={variant} />
      </TooltipIconBar>
    </header>
  );
}
