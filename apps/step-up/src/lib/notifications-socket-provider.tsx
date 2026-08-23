import { useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useEffect, useSyncExternalStore } from "react";
import type { Socket } from "socket.io-client";
import { useAuth } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/constants";
import {
  NOTIFICATIONS_CHANNEL,
  type NotificationBroadcastMessage,
  type NotificationDto,
  notificationsListKey,
  notificationsUnreadKey,
  publishNotificationBroadcast,
} from "@/lib/notifications-cache";
import {
  type NotificationsSocketState,
  notificationsSocketStore,
} from "@/lib/realtime-socket-store";

export type NotificationsSocketContextValue = NotificationsSocketState;

export function useNotificationsSocket(): NotificationsSocketContextValue {
  return useSyncExternalStore(
    notificationsSocketStore.subscribe,
    notificationsSocketStore.getSnapshot,
    notificationsSocketStore.getServerSnapshot,
  );
}

function setNotificationsSocketState(state: NotificationsSocketState) {
  notificationsSocketStore.setState(state);
}

export function NotificationsSocketProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user, getIdToken, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") {
      return;
    }

    const channel = new BroadcastChannel(NOTIFICATIONS_CHANNEL);
    channel.onmessage = (event: MessageEvent<NotificationBroadcastMessage>) => {
      const message = event.data;
      if (!message || message.userId !== userId) {
        return;
      }
      if (message.type === "invalidate") {
        void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      }
      if (message.type === "badge" && typeof message.unreadCount === "number") {
        queryClient.setQueryData(notificationsUnreadKey(userId), {
          count: message.unreadCount,
        });
      }
    };

    return () => channel.close();
  }, [queryClient, userId]);

  useEffect(() => {
    if (!userId || authLoading) {
      return;
    }

    let active = true;
    let created: Socket | null = null;

    void Promise.all([getIdToken(), import("socket.io-client")]).then(
      ([token, { io }]) => {
        if (!active || !token) {
          return;
        }

        created = io(`${getApiBaseUrl()}/notifications`, {
          auth: { token },
          transports: ["websocket", "polling"],
          reconnectionAttempts: 10,
          reconnectionDelay: 1000,
        });

        // Effect may have cleaned up between the active check and io().
        if (!active) {
          created.disconnect();
          created = null;
          return;
        }

        created.on("connect", () => {
          if (!active) {
            return;
          }
          setNotificationsSocketState({ connected: true, socket: created });
          void queryClient.invalidateQueries({ queryKey: ["notifications"] });
        });

        created.on("disconnect", () => {
          if (!active) {
            return;
          }
          setNotificationsSocketState({ connected: false, socket: created });
        });

        created.on("notification.created", (notification: NotificationDto) => {
          queryClient.setQueryData(
            notificationsListKey(userId),
            (
              current:
                | { items?: NotificationDto[]; nextCursor?: string | null }
                | undefined,
            ) => {
              if (!current?.items) {
                return current;
              }
              if (current.items.some((item) => item.id === notification.id)) {
                return {
                  ...current,
                  items: current.items.map((item) =>
                    item.id === notification.id ? notification : item,
                  ),
                };
              }
              return {
                ...current,
                items: [notification, ...current.items],
              };
            },
          );
          publishNotificationBroadcast({
            type: "invalidate",
            userId,
          });
        });

        created.on("notification.updated", (notification: NotificationDto) => {
          queryClient.setQueryData(
            notificationsListKey(userId),
            (
              current:
                | { items?: NotificationDto[]; nextCursor?: string | null }
                | undefined,
            ) => {
              if (!current?.items) {
                return current;
              }
              return {
                ...current,
                items: current.items.map((item) =>
                  item.id === notification.id
                    ? { ...item, ...notification }
                    : item,
                ),
              };
            },
          );
        });

        created.on(
          "notifications.badge",
          (payload: { unreadCount: number }) => {
            queryClient.setQueryData(notificationsUnreadKey(userId), {
              count: payload.unreadCount,
            });
            publishNotificationBroadcast({
              type: "badge",
              userId,
              unreadCount: payload.unreadCount,
            });
          },
        );

        created.on("notifications.bulk", () => {
          void queryClient.invalidateQueries({ queryKey: ["notifications"] });
          publishNotificationBroadcast({
            type: "invalidate",
            userId,
          });
        });

        setNotificationsSocketState({
          connected: created.connected,
          socket: created,
        });
      },
    );

    return () => {
      active = false;
      created?.disconnect();
      created = null;
      setNotificationsSocketState({ connected: false, socket: null });
    };
  }, [authLoading, getIdToken, queryClient, userId]);

  return children;
}
