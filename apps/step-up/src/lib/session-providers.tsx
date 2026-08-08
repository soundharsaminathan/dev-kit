import type { ReactNode } from "react";
import { ChatSocketProvider } from "@/lib/chat-socket-provider";
import { NotificationsSocketProvider } from "@/lib/notifications-socket-provider";
import { PushNotificationsProvider } from "@/lib/push-notifications";
import { StudioBrandProvider } from "@/modules/branding/studio-brand-provider";

/**
 * Socket/push hosts plus studio brand application. Must sit under both
 * ThemeProvider (BootThemeProvider → AppThemeProvider) and QueryProvider.
 */
export function SessionProviders({ children }: { children: ReactNode }) {
  return (
    <PushNotificationsProvider>
      <NotificationsSocketProvider>
        <ChatSocketProvider>
          <StudioBrandProvider>{children}</StudioBrandProvider>
        </ChatSocketProvider>
      </NotificationsSocketProvider>
    </PushNotificationsProvider>
  );
}
