import type { ShellVariant } from "./nav-config";

export type NotificationType =
  | "MISSED_SESSION"
  | "PLAN_EXPIRING"
  | "PAYMENT_OVERDUE"
  | "RENEWED"
  | "NOT_RENEWED"
  | "NEW_FOLLOW";

export type NotificationMeta = {
  sessionId?: string;
  batchId?: string;
  subscriptionId?: string;
  planId?: string;
  invoiceId?: string;
  followerId?: string;
};

export type NotificationDestination =
  | { to: "/me/batches/$id"; params: { id: string } }
  | { to: "/me/plans" }
  | { to: "/me/invoices" }
  | { to: "/me/attendance" }
  | { to: "/users/$id"; params: { id: string } }
  | { to: "/app/sessions/$id/attendance"; params: { id: string } }
  | { to: "/app/batches/$id"; params: { id: string } }
  | { to: "/app/plans" }
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
  const subscriptionId = pick("subscriptionId");
  const planId = pick("planId");
  const invoiceId = pick("invoiceId");
  const followerId = pick("followerId");
  if (sessionId) meta.sessionId = sessionId;
  if (batchId) meta.batchId = batchId;
  if (subscriptionId) meta.subscriptionId = subscriptionId;
  if (planId) meta.planId = planId;
  if (invoiceId) meta.invoiceId = invoiceId;
  if (followerId) meta.followerId = followerId;
  return meta;
}

export function resolveNotificationDestination(
  type: string,
  meta: unknown,
  variant: ShellVariant,
): NotificationDestination | null {
  const m = asMeta(meta);

  if (type === "NEW_FOLLOW") {
    return m.followerId
      ? { to: "/users/$id", params: { id: m.followerId } }
      : null;
  }

  if (variant === "me") {
    switch (type) {
      case "MISSED_SESSION":
        return m.batchId
          ? { to: "/me/batches/$id", params: { id: m.batchId } }
          : { to: "/me/attendance" };
      case "PLAN_EXPIRING":
      case "RENEWED":
      case "NOT_RENEWED":
        return { to: "/me/plans" };
      case "PAYMENT_OVERDUE":
        return { to: "/me/invoices" };
      default:
        return null;
    }
  }

  switch (type) {
    case "MISSED_SESSION":
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
    case "PLAN_EXPIRING":
    case "RENEWED":
    case "NOT_RENEWED":
      return { to: "/app/plans" };
    case "PAYMENT_OVERDUE":
      return { to: "/app/invoices" };
    default:
      return null;
  }
}
