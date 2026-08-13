import { describe, expect, it } from "vitest";
import { messagePreview, type ChatMessage } from "./types";

function message(overrides: Partial<ChatMessage>): ChatMessage {
  return {
    id: "msg-1",
    conversationId: "conv-1",
    type: "TEXT",
    sender: { id: "user-1", name: "Priya", role: "STUDENT" },
    text: null,
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

describe("messagePreview", () => {
  it("uses system notice text in the conversation list", () => {
    expect(
      messagePreview(
        message({ type: "SYSTEM", text: "Priya joined the group" }),
      ),
    ).toBe("Priya joined the group");
  });
});
