import type { ReactNode } from "react";
import { ChatSocketProvider } from "@/lib/chat-socket-provider";
import { NotificationsSocketProvider } from "@/lib/notifications-socket-provider";
import { PushNotificationsProvider } from "@/lib/push-notifications";

/**
 * Socket/push hosts. Studio brand theming lives under AppThemeProvider so this
 * chunk can mount as a SessionGate sibling without requiring ThemeProvider.
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
