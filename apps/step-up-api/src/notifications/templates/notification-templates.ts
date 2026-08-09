import type { NotificationType } from "@prisma/client";

export type NotificationTemplateInput = {
  type: NotificationType;
  title?: string;
  body?: string;
  planName?: string;
  periodEnd?: string;
  batchName?: string;
  sessionDate?: string;
  followerName?: string;
  conversationTitle?: string;
  messagePreview?: string;
  unreadCount?: number;
};

export function buildNotificationCopy(input: NotificationTemplateInput): {
  title: string;
  body: string;
} {
  if (input.title && input.body) {
    return { title: input.title, body: input.body };
  }

  switch (input.type) {
    case "MISSED_SESSION":
      return {
        title: input.title ?? "Missed session",
        body:
          input.body ??
          `You were marked absent for ${input.batchName ?? "a class"} on ${input.sessionDate ?? "a recent date"}.`,
      };
    case "SESSION_ADDED":
      return {
        title: input.title ?? "New class session",
        body:
          input.body ??
          `${input.batchName ?? "Your class"} added a session${
            input.sessionDate ? ` on ${input.sessionDate}` : ""
          }.`,
      };
    case "SESSION_CHANGED":
      return {
        title: input.title ?? "Session rescheduled",
        body:
          input.body ??
          `${input.batchName ?? "Your class"} changed the session time${
            input.sessionDate ? ` (${input.sessionDate})` : ""
          }.`,
      };
    case "SESSION_CANCELLED":
      return {
        title: input.title ?? "Session cancelled",
        body:
          input.body ??
          `${input.batchName ?? "Your class"} cancelled a session${
            input.sessionDate ? ` on ${input.sessionDate}` : ""
          }.`,
      };
    case "SUBSCRIPTION_EXPIRING":
      return {
        title: input.title ?? "Subscription expiring soon",
        body:
          input.body ??
          `Your ${input.planName ?? "subscription"} expires on ${input.periodEnd ?? "soon"}.`,
      };
    case "PAYMENT_OVERDUE":
      return {
        title: input.title ?? "Payment overdue",
        body:
          input.body ??
          "You have an overdue invoice. Bookings are frozen until payment is received.",
      };
    case "PAYMENT_RECEIVED":
      return {
        title: input.title ?? "Payment received",
        body:
          input.body ??
          "Your payment was recorded. A receipt has been sent to your email.",
      };
    case "RENEWED":
      return {
        title: input.title ?? "Subscription renewed",
        body:
          input.body ??
          `Your ${input.planName ?? "subscription"} is active through ${input.periodEnd ?? "the new period"}.`,
      };
    case "NOT_RENEWED":
      return {
        title: input.title ?? "Subscription not renewed",
        body:
          input.body ??
          `Your ${input.planName ?? "subscription"} has expired. Renew to keep attending classes.`,
      };
    case "NEW_FOLLOW":
      return {
        title: input.title ?? "New follower",
        body:
          input.body ??
          `${input.followerName ?? "Someone"} started following you.`,
      };
    case "CHAT_MESSAGE":
      return {
        title: input.title ?? input.conversationTitle ?? "New message",
        body:
          input.body ??
          (input.unreadCount && input.unreadCount > 1
            ? `${input.unreadCount} new messages`
            : (input.messagePreview ?? "You have a new message")),
      };
    default:
      return {
        title: input.title ?? "Notification",
        body: input.body ?? "",
      };
  }
}

export const NOTIFICATION_TYPE_REGISTRY: Record<
  string,
  { label: string; defaultChannels: Array<"IN_APP" | "PUSH" | "EMAIL"> }
> = {
  MISSED_SESSION: {
    label: "Missed sessions",
    defaultChannels: ["IN_APP", "PUSH"],
  },
  SESSION_ADDED: {
    label: "New sessions",
    defaultChannels: ["IN_APP", "PUSH"],
  },
  SESSION_CHANGED: {
    label: "Session schedule changes",
    defaultChannels: ["IN_APP", "PUSH"],
  },
  SESSION_CANCELLED: {
    label: "Cancelled sessions",
    defaultChannels: ["IN_APP", "PUSH"],
  },
  SUBSCRIPTION_EXPIRING: {
    label: "Subscription expiring",
    defaultChannels: ["IN_APP", "PUSH", "EMAIL"],
  },
  PAYMENT_OVERDUE: {
    label: "Payment overdue",
    defaultChannels: ["IN_APP", "PUSH", "EMAIL"],
  },
  PAYMENT_RECEIVED: {
    label: "Payment received",
    defaultChannels: ["IN_APP", "PUSH", "EMAIL"],
  },
  RENEWED: {
    label: "Subscription renewed",
    defaultChannels: ["IN_APP", "PUSH"],
  },
  NOT_RENEWED: {
    label: "Subscription not renewed",
    defaultChannels: ["IN_APP", "PUSH", "EMAIL"],
  },
  NEW_FOLLOW: { label: "New followers", defaultChannels: ["IN_APP", "PUSH"] },
  CHAT_MESSAGE: { label: "Chat messages", defaultChannels: ["IN_APP", "PUSH"] },
};
