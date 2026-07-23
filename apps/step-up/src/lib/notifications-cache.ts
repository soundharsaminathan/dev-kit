export const NOTIFICATIONS_CHANNEL = "step-up-notifications";

export type NotificationDto = {
  id: string;
  type: string;
  title: string;
  body: string;
  meta?: unknown;
  deepLink?: string | null;
  readAt: string | null;
  createdAt: string;
  status?: string;
};

export type NotificationsPage = {
  items: NotificationDto[];
  nextCursor: string | null;
};

export type NotificationBroadcastMessage = {
  type: "invalidate" | "badge";
  userId: string;
  unreadCount?: number;
};

export function notificationsListKey(userId: string | null | undefined) {
  return ["notifications", userId, "list"] as const;
}

export function notificationsUnreadKey(userId: string | null | undefined) {
  return ["notifications", userId, "unread-count"] as const;
}

export function publishNotificationBroadcast(
  message: NotificationBroadcastMessage,
) {
  if (typeof BroadcastChannel === "undefined") {
    return;
  }
  const channel = new BroadcastChannel(NOTIFICATIONS_CHANNEL);
  channel.postMessage(message);
  channel.close();
}

export function isPriorityToastType(type: string) {
  return (
    type === "PAYMENT_OVERDUE" ||
    type === "SUBSCRIPTION_EXPIRING" ||
    type === "NOT_RENEWED" ||
    type === "MISSED_SESSION"
  );
}
