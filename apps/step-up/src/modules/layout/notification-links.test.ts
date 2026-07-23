import { describe, expect, it } from "vitest";
import { resolveNotificationDestination } from "./notification-links";

describe("resolveNotificationDestination", () => {
  it("opens the follower profile for NEW_FOLLOW in both shells", () => {
    expect(
      resolveNotificationDestination(
        "NEW_FOLLOW",
        { followerId: "user-42" },
        "me",
      ),
    ).toEqual({ to: "/users/$id", params: { id: "user-42" } });

    expect(
      resolveNotificationDestination(
        "NEW_FOLLOW",
        { followerId: "user-42" },
        "app",
      ),
    ).toEqual({ to: "/users/$id", params: { id: "user-42" } });
  });

  it("returns null for NEW_FOLLOW without a followerId", () => {
    expect(resolveNotificationDestination("NEW_FOLLOW", {}, "me")).toBeNull();
  });

  it("routes chat notifications to the conversation", () => {
    expect(
      resolveNotificationDestination(
        "CHAT_MESSAGE",
        { conversationId: "c-1" },
        "me",
      ),
    ).toEqual({ to: "/me/messages/$id", params: { id: "c-1" } });

    expect(
      resolveNotificationDestination(
        "CHAT_MESSAGE",
        { conversationId: "c-1" },
        "app",
      ),
    ).toEqual({ to: "/app/messages/$id", params: { id: "c-1" } });
  });

  it("routes subscription lifecycle notifications", () => {
    expect(
      resolveNotificationDestination("SUBSCRIPTION_EXPIRING", {}, "me"),
    ).toEqual({ to: "/me/subscriptions" });
    expect(resolveNotificationDestination("RENEWED", {}, "app")).toEqual({
      to: "/app/subscriptions",
    });
  });
});
