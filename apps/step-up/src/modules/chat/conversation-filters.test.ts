import { describe, expect, it } from "vitest";
import {
  filterConversations,
  isGroupConversation,
  isUnreadConversation,
} from "./conversation-filters";
import type { ChatConversation, ChatMessage } from "./types";

function message(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: "msg-1",
    conversationId: "conv-1",
    type: "TEXT",
    sender: { id: "other-1", name: "Priya", role: "STUDENT" },
    text: "Hey",
    location: null,
    imageUrls: [],
    audioUrl: null,
    audioDuration: null,
    replyTo: null,
    reactions: [],
    poll: null,
    event: null,
    deleted: false,
    createdAt: "2026-08-13T10:00:00.000Z",
    ...overrides,
  };
}

function conversation(
  overrides: Partial<ChatConversation> = {},
): ChatConversation {
  return {
    id: "conv-1",
    type: "DM",
    title: "Priya",
    imageUrl: null,
    batch: null,
    members: [],
    myRole: "MEMBER",
    lastReadAt: "2026-08-13T09:00:00.000Z",
    lastMessageAt: "2026-08-13T10:00:00.000Z",
    unreadCount: 0,
    lastMessage: message(),
    createdAt: "2026-08-12T10:00:00.000Z",
    ...overrides,
  };
}

describe("conversation filters", () => {
  const viewerId = "me-1";
  const dmRead = conversation({ id: "dm-read", unreadCount: 0 });
  const dmUnread = conversation({
    id: "dm-unread",
    title: "Alex",
    unreadCount: 3,
  });
  const group = conversation({
    id: "group-1",
    type: "GROUP",
    title: "Weekend crew",
    unreadCount: 0,
  });
  const batch = conversation({
    id: "batch-1",
    type: "BATCH",
    title: "Hip Hop Kids",
    unreadCount: 2,
  });

  it("treats GROUP and BATCH chats as groups", () => {
    expect(isGroupConversation(group)).toBe(true);
    expect(isGroupConversation(batch)).toBe(true);
    expect(isGroupConversation(dmRead)).toBe(false);
  });

  it("treats a missing unread count as read", () => {
    expect(isUnreadConversation(dmUnread)).toBe(true);
    expect(isUnreadConversation(dmRead)).toBe(false);
    expect(
      isUnreadConversation(
        conversation({ unreadCount: undefined as unknown as number }),
      ),
    ).toBe(false);
  });

  it("keeps unread conversations on the unread filter", () => {
    expect(
      filterConversations(
        [dmRead, dmUnread, group, batch],
        "unread",
        "",
        viewerId,
      ).map((item) => item.id),
    ).toEqual(["dm-unread", "batch-1"]);
  });

  it("includes class chats on the group filter", () => {
    expect(
      filterConversations(
        [dmRead, dmUnread, group, batch],
        "group",
        "",
        viewerId,
      ).map((item) => item.id),
    ).toEqual(["group-1", "batch-1"]);
  });

  it("applies search within the active filter", () => {
    expect(
      filterConversations(
        [dmRead, dmUnread, group, batch],
        "group",
        "hip",
        viewerId,
      ).map((item) => item.id),
    ).toEqual(["batch-1"]);
  });
});
