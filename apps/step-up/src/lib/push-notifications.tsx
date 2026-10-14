import { useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useEffect, useRef } from "react";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import { isAuthBypassEnabled } from "@/lib/constants";
import {
  isPriorityToastType,
  notificationsListKey,
  notificationsUnreadKey,
} from "@/lib/notifications-cache";

export function PushNotificationsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user, loading } = useAuth();
  const api = useApi();
  const queryClient = useQueryClient();
  const syncedRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading || !user || isAuthBypassEnabled()) {
      return;
    }

    let cancelled = false;

    async function registerPush(fcmToken: string | null) {
      if (!fcmToken) {
        return;
      }

      const syncKey = `${user!.id}:${fcmToken}`;
      if (syncedRef.current === syncKey) {
        return;
      }

      await api.post("/notifications/devices", {
        token: fcmToken,
        platform: "web",
        userAgent: navigator.userAgent,
      });

      syncedRef.current = syncKey;
    }

    async function setupPush() {
      const [{ getToken, isSupported, onMessage }, messagingMod] =
        await Promise.all([
          import("firebase/messaging"),
          import("@/lib/firebase-messaging"),
        ]);

      const supported = await isSupported();
      if (!supported || cancelled) {
        return;
      }

      let permission = Notification.permission;
      if (permission === "default") {
        permission = await Notification.requestPermission();
      }

      if (permission !== "granted" || cancelled) {
        return;
      }

      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        return;
      }

      const registration = await messagingMod.registerMessagingServiceWorker();
      const messaging = await messagingMod.getFirebaseMessagingAsync();
      if (!registration || !messaging || cancelled) {
        return;
      }

      const fcmToken = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      });

      if (cancelled || !fcmToken) {
        return;
      }

      await registerPush(fcmToken);

      onMessage(messaging, (payload) => {
        void queryClient.invalidateQueries({
          queryKey: notificationsListKey(user!.id),
        });
        void queryClient.invalidateQueries({
          queryKey: notificationsUnreadKey(user!.id),
        });

        const type = payload.data?.type;
        if (type && isPriorityToastType(type) && payload.notification) {
          // Browser may also show SW notification when focused; keep soft feedback via title.
          console.info(
            `[notifications] ${payload.notification.title ?? type}: ${payload.notification.body ?? ""}`,
          );
        }
      });
    }

    void setupPush().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [api, loading, queryClient, user]);

  return children;
}
