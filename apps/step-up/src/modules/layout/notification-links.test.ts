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
});
