import { describe, expect, it } from "vitest";
import {
  isPriorityToastType,
  resolveDeepLink,
  sanitizeDeepLink,
} from "./deep-link";

describe("sanitizeDeepLink", () => {
  it("allows known app paths and rejects unsafe ones", () => {
    expect(sanitizeDeepLink("/me/attendance")).toBe("/me/attendance");
    expect(sanitizeDeepLink("/app/subscriptions")).toBe("/app/subscriptions");
    expect(sanitizeDeepLink("/users/user-1")).toBe("/users/user-1");
    expect(sanitizeDeepLink("/chat/c-1")).toBe("/chat/c-1");

    expect(sanitizeDeepLink("https://evil.example")).toBeNull();
    expect(sanitizeDeepLink("//evil.example")).toBeNull();
    expect(sanitizeDeepLink("/admin/secrets")).toBeNull();
    expect(sanitizeDeepLink(null)).toBeNull();
  });
});

describe("resolveDeepLink", () => {
  it("prefers an explicit sanitized deep link", () => {
    expect(
      resolveDeepLink({
        type: "MISSED_SESSION",
        deepLink: "/me/attendance",
        meta: { batchId: "batch-1" },
      }),
    ).toBe("/me/attendance");
  });

  it("resolves type-specific destinations from meta", () => {
    expect(
      resolveDeepLink({
        type: "MISSED_SESSION",
        meta: { batchId: "batch-1" },
      }),
    ).toBe("/me/batches/batch-1");

    expect(resolveDeepLink({ type: "MISSED_SESSION", meta: {} })).toBe(
      "/me/attendance",
    );

    expect(
      resolveDeepLink({
        type: "NEW_FOLLOW",
        meta: { followerId: "user-42" },
      }),
    ).toBe("/users/user-42");

    expect(
      resolveDeepLink({
        type: "CHAT_MESSAGE",
        meta: { conversationId: "c-1" },
      }),
    ).toBe("/me/messages/c-1");

    expect(resolveDeepLink({ type: "RENEWED", meta: {} })).toBe(
      "/me/subscriptions",
    );
    expect(resolveDeepLink({ type: "PAYMENT_OVERDUE", meta: {} })).toBe(
      "/me/invoices",
    );
    expect(resolveDeepLink({ type: "PAYMENT_RECEIVED", meta: {} })).toBe(
      "/me/invoices",
    );
  });
});

describe("isPriorityToastType", () => {
  it("flags high-priority types for foreground toasts", () => {
    expect(isPriorityToastType("PAYMENT_OVERDUE")).toBe(true);
    expect(isPriorityToastType("PAYMENT_RECEIVED")).toBe(true);
    expect(isPriorityToastType("MISSED_SESSION")).toBe(true);
    expect(isPriorityToastType("RENEWED")).toBe(false);
  });
});
