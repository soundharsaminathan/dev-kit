import type { ChatReaction } from "./types";

export function toggleReactionOptimistically(
  reactions: ChatReaction[],
  emoji: string,
  removing: boolean,
  userId: string,
): ChatReaction[] {
  if (removing) {
    return reactions
      .map((reaction) => {
        if (reaction.emoji !== emoji) {
          return reaction;
        }
        const userIds = reaction.userIds.filter((id) => id !== userId);
        if (userIds.length === 0) {
          return null;
        }
        return { ...reaction, userIds, count: userIds.length };
      })
      .filter((reaction): reaction is ChatReaction => reaction !== null);
  }

  const existing = reactions.find((reaction) => reaction.emoji === emoji);
  if (existing) {
    if (existing.userIds.includes(userId)) {
      return reactions;
    }
    const userIds = [...existing.userIds, userId];
    return reactions.map((reaction) =>
      reaction.emoji === emoji
        ? { ...reaction, userIds, count: userIds.length }
        : reaction,
    );
  }

  return [...reactions, { emoji, userIds: [userId], count: 1 }];
}
