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
import { avatarLetter, resolveDisplayName } from "@/lib/display-name";
import {
  notificationsListKey,
  notificationsUnreadKey,
  publishNotificationBroadcast,
} from "@/lib/notifications-cache";
import { useNotificationsSocket } from "@/lib/notifications-socket-provider";
import { StudioBrandMark } from "@/modules/branding/studio-brand-mark";
import { StaffAgentControl } from "@/modules/staff-agent/staff-agent-control";
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
import { useNavEnabledFeatures } from "./use-nav-enabled-features";
import type { NotificationDestination } from "./notification-links";
import {
  type NotificationItem,
  NotificationsPanel,
} from "./notifications-panel";

type AppHeaderProps = {
  variant: ShellVariant;
};

type NotificationsPage = {
  items: NotificationItem[];
  nextCursor: string | null;
};

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
    onError: (_error: unknown, _id, context) => {
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
          data-testid="notifications-bell"
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
  const studioId = user?.studioId;

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
      {studioId ? (
        <Link
          to="/studio/$studioId"
          params={{ studioId }}
          className={styles.menuLink}
          role="menuitem"
          onClick={() => setOpen(false)}
        >
          <Icon name="external-link" />
          View studio
        </Link>
      ) : null}
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
              <AvatarImage
                src={user.photoUrl}
                alt={resolveDisplayName(user.name, user.email) ?? user.name}
              />
            ) : null}
            <AvatarFallback>
              {user ? (
                avatarLetter(user.name, user.email)
              ) : (
                <Icon name="user" />
              )}
            </AvatarFallback>
          </Avatar>
          <span className={styles.profileName}>
            {resolveDisplayName(user?.name, user?.email) ?? "Account"}
          </span>
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
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const enabledFeatures = useNavEnabledFeatures(variant);
  const headerLinks = getHeaderNavLinks(
    variant,
    user?.role,
    isMobile,
    enabledFeatures,
  );
  const showStaffAgent =
    variant === "app" &&
    enabledFeatures !== null &&
    (enabledFeatures === undefined || enabledFeatures.has("ai_agent"));

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <StudioBrandMark
          className={styles.brandMark}
          labelClassName={styles.brandLabel}
          logoClassName={styles.brandLogo}
        />
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
        {showStaffAgent ? <StaffAgentControl /> : null}
        <NotificationsControl variant={variant} />
        <ProfileControl variant={variant} />
      </TooltipIconBar>
    </header>
  );
}
