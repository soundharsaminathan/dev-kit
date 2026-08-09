import type { ShellVariant } from "./nav-config";

export type NotificationType =
  | "MISSED_SESSION"
  | "SESSION_ADDED"
  | "SESSION_CHANGED"
  | "SESSION_CANCELLED"
  | "SUBSCRIPTION_EXPIRING"
  | "PAYMENT_OVERDUE"
  | "PAYMENT_RECEIVED"
  | "RENEWED"
  | "NOT_RENEWED"
  | "NEW_FOLLOW"
  | "CHAT_MESSAGE";

export type NotificationMeta = {
  sessionId?: string;
  batchId?: string;
  membershipId?: string;
  subscriptionId?: string;
  invoiceId?: string;
  followerId?: string;
  conversationId?: string;
};

export type NotificationDestination =
  | { to: "/me/batches/$id"; params: { id: string } }
  | { to: "/me/subscriptions" }
  | { to: "/me/invoices" }
  | { to: "/me/attendance" }
  | { to: "/me/calendar" }
  | { to: "/me/messages" }
  | { to: "/me/messages/$id"; params: { id: string } }
  | { to: "/app/messages" }
  | { to: "/app/messages/$id"; params: { id: string } }
  | { to: "/users/$id"; params: { id: string } }
  | { to: "/app/sessions/$id/attendance"; params: { id: string } }
  | { to: "/app/batches/$id"; params: { id: string } }
  | { to: "/app/subscriptions" }
  | { to: "/app/invoices" }
  | { to: "/app/calendar" };

function asMeta(value: unknown): NotificationMeta {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const record = value as Record<string, unknown>;
  const pick = (key: keyof NotificationMeta) => {
    const raw = record[key];
    return typeof raw === "string" && raw.length > 0 ? raw : undefined;
  };
  const meta: NotificationMeta = {};
  const sessionId = pick("sessionId");
  const batchId = pick("batchId");
  const membershipId = pick("membershipId");
  const subscriptionId = pick("subscriptionId");
  const invoiceId = pick("invoiceId");
  const followerId = pick("followerId");
  const conversationId = pick("conversationId");
  if (sessionId) meta.sessionId = sessionId;
  if (batchId) meta.batchId = batchId;
  if (membershipId) meta.membershipId = membershipId;
  if (subscriptionId) meta.subscriptionId = subscriptionId;
  if (invoiceId) meta.invoiceId = invoiceId;
  if (followerId) meta.followerId = followerId;
  if (conversationId) meta.conversationId = conversationId;
  return meta;
}

export function resolveNotificationDestination(
  type: NotificationType | string,
  meta: unknown,
  shell: ShellVariant,
): NotificationDestination | null {
  const m = asMeta(meta);

  if (type === "NEW_FOLLOW" && m.followerId) {
    return { to: "/users/$id", params: { id: m.followerId } };
  }

  if (type === "CHAT_MESSAGE") {
    if (shell === "admin") return null;
    if (m.conversationId) {
      return shell === "me"
        ? { to: "/me/messages/$id", params: { id: m.conversationId } }
        : { to: "/app/messages/$id", params: { id: m.conversationId } };
    }
    return shell === "me" ? { to: "/me/messages" } : { to: "/app/messages" };
  }

  if (shell === "me") {
    switch (type) {
      case "MISSED_SESSION":
        return m.batchId
          ? { to: "/me/batches/$id", params: { id: m.batchId } }
          : { to: "/me/attendance" };
      case "SESSION_ADDED":
      case "SESSION_CHANGED":
      case "SESSION_CANCELLED":
        return m.batchId
          ? { to: "/me/batches/$id", params: { id: m.batchId } }
          : { to: "/me/calendar" };
      case "SUBSCRIPTION_EXPIRING":
      case "RENEWED":
      case "NOT_RENEWED":
        return { to: "/me/subscriptions" };
      case "PAYMENT_OVERDUE":
      case "PAYMENT_RECEIVED":
        return { to: "/me/invoices" };
      default:
        return null;
    }
  }

  if (shell === "admin") {
    return null;
  }

  switch (type) {
    case "MISSED_SESSION":
    case "SESSION_ADDED":
    case "SESSION_CHANGED":
      if (m.sessionId) {
        return {
          to: "/app/sessions/$id/attendance",
          params: { id: m.sessionId },
        };
      }
      if (m.batchId) {
        return { to: "/app/batches/$id", params: { id: m.batchId } };
      }
      return { to: "/app/calendar" };
    case "SESSION_CANCELLED":
      if (m.batchId) {
        return { to: "/app/batches/$id", params: { id: m.batchId } };
      }
      return { to: "/app/calendar" };
    case "SUBSCRIPTION_EXPIRING":
    case "RENEWED":
    case "NOT_RENEWED":
      return { to: "/app/subscriptions" };
    case "PAYMENT_OVERDUE":
    case "PAYMENT_RECEIVED":
      return { to: "/app/invoices" };
    default:
      return null;
  }
}
