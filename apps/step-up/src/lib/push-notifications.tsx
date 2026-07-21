import { useQueryClient } from "@tanstack/react-query";
import { getToken, isSupported, onMessage } from "firebase/messaging";
import { type ReactNode, useEffect, useRef } from "react";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import { isAuthBypassEnabled } from "@/lib/constants";
import {
  getFirebaseMessaging,
  registerMessagingServiceWorker,
} from "@/lib/firebase";

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

      await api.post("/auth/sync", {
        name: user!.name,
        email: user!.email,
        fcmToken,
      });

      syncedRef.current = syncKey;
    }

    async function setupPush() {
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

      const registration = await registerMessagingServiceWorker();
      const messaging = getFirebaseMessaging();
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

      onMessage(messaging, () => {
        void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      });
    }

    void setupPush().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [api, loading, queryClient, user]);

  return children;
}
