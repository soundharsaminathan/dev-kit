import { describe, expect, it } from "vitest";
import { toggleReactionOptimistically } from "./optimistic-reactions";
import type { ChatReaction } from "./types";

const USER_ID = "user-1";

describe("toggleReactionOptimistically", () => {
  it("adds a new reaction", () => {
    const result = toggleReactionOptimistically([], "👍", false, USER_ID);
    expect(result).toEqual([{ emoji: "👍", userIds: [USER_ID], count: 1 }]);
  });

  it("adds the user to an existing reaction", () => {
    const reactions: ChatReaction[] = [
      { emoji: "👍", userIds: ["user-2"], count: 1 },
    ];
    const result = toggleReactionOptimistically(
      reactions,
      "👍",
      false,
      USER_ID,
    );
    expect(result).toEqual([
      { emoji: "👍", userIds: ["user-2", USER_ID], count: 2 },
    ]);
  });

  it("removes the user from a reaction", () => {
    const reactions: ChatReaction[] = [
      { emoji: "👍", userIds: [USER_ID, "user-2"], count: 2 },
    ];
    const result = toggleReactionOptimistically(reactions, "👍", true, USER_ID);
    expect(result).toEqual([{ emoji: "👍", userIds: ["user-2"], count: 1 }]);
  });

  it("drops the reaction when the last user is removed", () => {
    const reactions: ChatReaction[] = [
      { emoji: "👍", userIds: [USER_ID], count: 1 },
    ];
    const result = toggleReactionOptimistically(reactions, "👍", true, USER_ID);
    expect(result).toEqual([]);
  });
});
