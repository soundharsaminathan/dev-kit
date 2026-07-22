import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { chatMessagesKey } from "@/lib/chat-cache";
import {
  deliverPendingSend,
  flushOutbox,
  getPendingSend,
  listPendingSends,
  type PendingChatSend,
  queueOptimisticSend,
  resetOutboxForTests,
  retryPendingSend,
} from "./optimistic-send";
import type { ChatMessagesPage } from "./types";

vi.mock("./upload", () => ({
  uploadChatAudio: vi.fn(),
  uploadChatPhotos: vi.fn(),
}));

function sender() {
  return {
    id: "user-1",
    name: "Ada",
    photoUrl: null,
    role: "STUDENT",
  };
}

function makePayload(
  overrides: Partial<PendingChatSend> = {},
): PendingChatSend {
  return {
    clientId: overrides.clientId ?? crypto.randomUUID(),
    conversationId: overrides.conversationId ?? "conv-1",
    text: overrides.text ?? "hello",
    files: overrides.files ?? [],
    localImageUrls: overrides.localImageUrls ?? [],
    voiceFile: overrides.voiceFile ?? null,
    localAudioUrl: overrides.localAudioUrl ?? null,
    audioDuration: overrides.audioDuration ?? null,
    location: overrides.location ?? null,
    locationLabel: overrides.locationLabel ?? "",
    replyTo: overrides.replyTo ?? null,
    sender: overrides.sender ?? sender(),
  };
}

function seedMessagesCache(queryClient: QueryClient, conversationId: string) {
  queryClient.setQueryData(chatMessagesKey(conversationId), {
    pages: [
      {
        messages: [],
        nextCursor: null,
      } satisfies ChatMessagesPage,
    ],
    pageParams: [undefined],
  });
}

function messagesInCache(queryClient: QueryClient, conversationId: string) {
  const data = queryClient.getQueryData<{
    pages: ChatMessagesPage[];
  }>(chatMessagesKey(conversationId));
  return data?.pages[0]?.messages ?? [];
}

describe("chat outbox", () => {
  let queryClient: QueryClient;
  let api: { post: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    resetOutboxForTests();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    api = { post: vi.fn() };
    vi.stubGlobal("navigator", { onLine: true });
    seedMessagesCache(queryClient, "conv-1");
    seedMessagesCache(queryClient, "conv-2");
  });

  afterEach(() => {
    resetOutboxForTests();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("queues offline sends without posting", () => {
    vi.stubGlobal("navigator", { onLine: false });
    const payload = makePayload({ clientId: "c1", text: "offline" });

    queueOptimisticSend(queryClient, payload, { sendStatus: "queued" });

    expect(getPendingSend("c1")).toEqual(payload);
    expect(messagesInCache(queryClient, "conv-1")[0]?.sendStatus).toBe(
      "queued",
    );
    expect(api.post).not.toHaveBeenCalled();
  });

  it("posts clientMessageId and replaces the optimistic row on success", async () => {
    const payload = makePayload({ clientId: "c2", text: "hi" });
    queueOptimisticSend(queryClient, payload, { sendStatus: "sending" });

    api.post.mockResolvedValue({
      id: "msg-server",
      conversationId: "conv-1",
      type: "TEXT",
      sender: sender(),
      text: "hi",
      location: null,
      imageUrls: [],
      audioUrl: null,
      audioDuration: null,
      replyTo: null,
      reactions: [],
      poll: null,
      event: null,
      deleted: false,
      createdAt: "2026-07-20T12:00:00.000Z",
    });

    await deliverPendingSend(api as never, queryClient, payload);

    expect(api.post).toHaveBeenCalledWith(
      "/chat/conversations/conv-1/messages",
      expect.objectContaining({
        text: "hi",
        clientMessageId: "c2",
      }),
    );
    expect(getPendingSend("c2")).toBeNull();
    expect(messagesInCache(queryClient, "conv-1")[0]?.id).toBe("msg-server");
  });

  it("marks non-retryable 4xx as failed", async () => {
    const payload = makePayload({ clientId: "c3" });
    queueOptimisticSend(queryClient, payload, { sendStatus: "sending" });
    api.post.mockRejectedValue(new ApiError("Bad request", 400));

    await expect(
      deliverPendingSend(api as never, queryClient, payload),
    ).rejects.toBeInstanceOf(ApiError);

    expect(messagesInCache(queryClient, "conv-1")[0]?.sendStatus).toBe(
      "failed",
    );
    expect(getPendingSend("c3")).not.toBeNull();
  });

  it("does not auto-flush failed 4xx messages", async () => {
    const payload = makePayload({ clientId: "c3b" });
    queueOptimisticSend(queryClient, payload, { sendStatus: "sending" });
    api.post.mockRejectedValue(new ApiError("Bad request", 400));

    await expect(
      deliverPendingSend(api as never, queryClient, payload),
    ).rejects.toBeInstanceOf(ApiError);

    api.post.mockClear();
    await flushOutbox(api as never, queryClient);
    expect(api.post).not.toHaveBeenCalled();
  });

  it("re-queues retryable failures with backoff", async () => {
    vi.useFakeTimers();
    const payload = makePayload({ clientId: "c4" });
    queueOptimisticSend(queryClient, payload, { sendStatus: "sending" });
    api.post.mockRejectedValue(new ApiError("Server error", 503));

    await expect(
      deliverPendingSend(api as never, queryClient, payload),
    ).rejects.toBeInstanceOf(ApiError);

    expect(messagesInCache(queryClient, "conv-1")[0]?.sendStatus).toBe(
      "queued",
    );
    expect(getPendingSend("c4")).not.toBeNull();
  });

  it("flushes pending sends in enqueue order per conversation", async () => {
    const first = makePayload({ clientId: "a1", text: "one" });
    const second = makePayload({ clientId: "a2", text: "two" });
    const other = makePayload({
      clientId: "b1",
      conversationId: "conv-2",
      text: "other",
    });

    vi.stubGlobal("navigator", { onLine: false });
    queueOptimisticSend(queryClient, first, { sendStatus: "queued" });
    queueOptimisticSend(queryClient, second, { sendStatus: "queued" });
    queueOptimisticSend(queryClient, other, { sendStatus: "queued" });

    expect(listPendingSends().map((p) => p.clientId)).toEqual([
      "a1",
      "a2",
      "b1",
    ]);

    const order: string[] = [];
    api.post.mockImplementation(
      async (_path: string, body: { text?: string }) => {
        order.push(body.text ?? "");
        return {
          id: `msg-${body.text}`,
          conversationId: body.text === "other" ? "conv-2" : "conv-1",
          type: "TEXT",
          sender: sender(),
          text: body.text ?? null,
          location: null,
          imageUrls: [],
          audioUrl: null,
          audioDuration: null,
          replyTo: null,
          reactions: [],
          poll: null,
          event: null,
          deleted: false,
          createdAt: "2026-07-20T12:00:00.000Z",
        };
      },
    );

    vi.stubGlobal("navigator", { onLine: true });
    await flushOutbox(api as never, queryClient);

    expect(order).toEqual(["one", "two", "other"]);
    expect(listPendingSends()).toHaveLength(0);
  });

  it("skips flush while offline", async () => {
    const payload = makePayload({ clientId: "c-off", text: "wait" });
    vi.stubGlobal("navigator", { onLine: false });
    queueOptimisticSend(queryClient, payload, { sendStatus: "queued" });

    await flushOutbox(api as never, queryClient);

    expect(api.post).not.toHaveBeenCalled();
    expect(getPendingSend("c-off")).not.toBeNull();
  });

  it("manual retry resets backoff and delivers", async () => {
    const payload = makePayload({ clientId: "c5", text: "retry me" });
    queueOptimisticSend(queryClient, payload, { sendStatus: "sending" });
    api.post
      .mockRejectedValueOnce(new ApiError("Bad request", 400))
      .mockResolvedValueOnce({
        id: "msg-retry",
        conversationId: "conv-1",
        type: "TEXT",
        sender: sender(),
        text: "retry me",
        location: null,
        imageUrls: [],
        audioUrl: null,
        audioDuration: null,
        replyTo: null,
        reactions: [],
        poll: null,
        event: null,
        deleted: false,
        createdAt: "2026-07-20T12:00:00.000Z",
      });

    await expect(
      deliverPendingSend(api as never, queryClient, payload),
    ).rejects.toBeInstanceOf(ApiError);

    await retryPendingSend(api as never, queryClient, "c5");

    expect(api.post).toHaveBeenCalledTimes(2);
    expect(getPendingSend("c5")).toBeNull();
    expect(messagesInCache(queryClient, "conv-1")[0]?.id).toBe("msg-retry");
  });
});
