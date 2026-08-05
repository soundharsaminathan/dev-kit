import type { NotificationType, Prisma } from "@prisma/client";

const DEEP_LINK_ALLOWLIST = [
  /^\/me(\/|$)/,
  /^\/app(\/|$)/,
  /^\/users\//,
  /^\/chat(\/|$)/,
] as const;

export function sanitizeDeepLink(
  deepLink: string | null | undefined,
): string | null {
  if (!deepLink || typeof deepLink !== "string") {
    return null;
  }
  if (!deepLink.startsWith("/") || deepLink.startsWith("//")) {
    return null;
  }
  if (!DEEP_LINK_ALLOWLIST.some((pattern) => pattern.test(deepLink))) {
    return null;
  }
  return deepLink;
}

export function resolveDeepLink(input: {
  type: NotificationType | string;
  deepLink?: string | null;
  meta?: Prisma.InputJsonValue | null;
}): string | null {
  const explicit = sanitizeDeepLink(input.deepLink ?? undefined);
  if (explicit) {
    return explicit;
  }

  const meta =
    input.meta && typeof input.meta === "object" && !Array.isArray(input.meta)
      ? (input.meta as Record<string, unknown>)
      : {};

  const stringMeta = (key: string) => {
    const value = meta[key];
    return typeof value === "string" && value.length > 0 ? value : null;
  };

  switch (input.type) {
    case "NEW_FOLLOW": {
      const followerId = stringMeta("followerId");
      return followerId ? `/users/${followerId}` : null;
    }
    case "MISSED_SESSION": {
      const batchId = stringMeta("batchId");
      return batchId ? `/me/batches/${batchId}` : "/me/attendance";
    }
    case "SUBSCRIPTION_EXPIRING":
    case "RENEWED":
    case "NOT_RENEWED":
      return "/me/subscriptions";
    case "PAYMENT_OVERDUE":
    case "PAYMENT_RECEIVED":
      return "/me/invoices";
    case "CHAT_MESSAGE": {
      const conversationId = stringMeta("conversationId");
      return conversationId ? `/me/messages/${conversationId}` : "/me/messages";
    }
    default:
      return null;
  }
}

export function isPriorityToastType(type: string) {
  return (
    type === "PAYMENT_OVERDUE" ||
    type === "PAYMENT_RECEIVED" ||
    type === "SUBSCRIPTION_EXPIRING" ||
    type === "NOT_RENEWED" ||
    type === "MISSED_SESSION"
  );
}
