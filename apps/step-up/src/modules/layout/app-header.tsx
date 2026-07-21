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

type AppHeaderProps = {
  variant: ShellVariant;
};

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  meta?: unknown;
  readAt: string | null;
  createdAt: string;
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

function NotificationsPanel({
  items,
  loading,
  variant,
  onMarkRead,
  onOpen,
}: {
  items: NotificationItem[];
  loading: boolean;
  variant: ShellVariant;
  onMarkRead: (id: string) => void;
  onOpen: (destination: NotificationDestination) => void;
}) {
  if (loading) {
    return <Text className={styles.empty}>Loading…</Text>;
  }

  if (items.length === 0) {
    return <Text className={styles.empty}>No notifications yet</Text>;
  }

  return (
    <ul className={styles.notificationList}>
      {items.map((item) => {
        const destination = resolveNotificationDestination(
          item.type,
          item.meta,
          variant,
        );

        return (
          <li key={item.id}>
            <button
              type="button"
              className={styles.notificationItem}
              data-unread={item.readAt ? undefined : "true"}
              data-link={destination ? "true" : undefined}
              onClick={() => {
                if (!item.readAt) {
                  onMarkRead(item.id);
                }
                if (destination) {
                  onOpen(destination);
                }
              }}
            >
              <span className={styles.notificationTitle}>{item.title}</span>
              <span className={styles.notificationBody}>{item.body}</span>
              <span className={styles.notificationMeta}>
                {formatRelative(item.createdAt)}
                {destination ? " · Open" : ""}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
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
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const query = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () => api.get<NotificationItem[]>("/notifications"),
    enabled: Boolean(user),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const items = query.data ?? [];
  const unreadCount = items.filter((item) => !item.readAt).length;

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
      variant={variant}
      onMarkRead={(id) => markRead.mutate(id)}
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
          onClick={() => setOpen((value) => !value)}
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
          <div className={styles.panelHeader}>
            <Text>Notifications</Text>
          </div>
          {panel}
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
            <Text>Notifications</Text>
          </div>
          {panel}
        </div>
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
