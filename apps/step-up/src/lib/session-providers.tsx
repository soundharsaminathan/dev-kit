import type { ReactNode } from "react";
import { ChatSocketProvider } from "@/lib/chat-socket-provider";
import { NotificationsSocketProvider } from "@/lib/notifications-socket-provider";
import { PushNotificationsProvider } from "@/lib/push-notifications";

/**
 * Socket/push hosts deferred past first paint. Must sit under QueryProvider.
 */
export function SessionProviders({ children }: { children: ReactNode }) {
  return (
    <PushNotificationsProvider>
      <NotificationsSocketProvider>
        <ChatSocketProvider>{children}</ChatSocketProvider>
      </NotificationsSocketProvider>
    </PushNotificationsProvider>
  );
}
