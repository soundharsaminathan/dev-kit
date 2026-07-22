import type { ReactNode } from "react";
import { ChatSocketProvider } from "@/lib/chat-socket-provider";
import { NotificationsSocketProvider } from "@/lib/notifications-socket-provider";
import { PushNotificationsProvider } from "@/lib/push-notifications";

export function SessionProviders({ children }: { children: ReactNode }) {
  return (
    <PushNotificationsProvider>
      <NotificationsSocketProvider>
        <ChatSocketProvider>{children}</ChatSocketProvider>
      </NotificationsSocketProvider>
    </PushNotificationsProvider>
  );
}
