import type { ReactNode } from "react";
import { ChatSocketProvider } from "@/lib/chat-socket-provider";
import { PushNotificationsProvider } from "@/lib/push-notifications";

export function SessionProviders({ children }: { children: ReactNode }) {
  return (
    <PushNotificationsProvider>
      <ChatSocketProvider>{children}</ChatSocketProvider>
    </PushNotificationsProvider>
  );
}
