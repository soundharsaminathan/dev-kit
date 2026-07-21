import type { QueryClient } from "@tanstack/react-query";
import { type ApiClient, ApiError } from "@/lib/api";
import {
  appendMessageToCache,
  chatConversationsKey,
  removeMessageFromCache,
  replaceOptimisticMessage,
  updateMessagesInCache,
} from "@/lib/chat-socket";
import type {
  ChatLocation,
  ChatMessage,
  ChatMessageKind,
  ChatMessageSendStatus,
  ChatReply,
  ChatUser,
} from "./types";
import { uploadChatAudio, uploadChatPhotos } from "./upload";

export type PendingChatSend = {
  clientId: string;
  conversationId: string;
  text: string;
  files: File[];
  localImageUrls: string[];
  voiceFile: File | null;
  localAudioUrl: string | null;
  audioDuration: number | null;
  location: ChatLocation | null;
  locationLabel: string;
  replyTo: ChatReply | null;
  sender: ChatUser;
};

type OutboxEntry = {
  payload: PendingChatSend;
  attempts: number;
  nextAttemptAt: number;
  enqueueOrder: number;
  status: ChatMessageSendStatus;
};

const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30_000;

const pendingSends = new Map<string, OutboxEntry>();
let enqueueSeq = 0;
let flushing = false;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushDeps: { api: ApiClient; queryClient: QueryClient } | null = null;

function messageTypeFor(payload: PendingChatSend): ChatMessageKind {
  if (payload.voiceFile || payload.localAudioUrl) {
    return "AUDIO";
  }
  if (payload.files.length > 0 || payload.localImageUrls.length > 0) {
    return "IMAGE";
  }
  if (payload.location && !payload.text.trim()) {
    return "LOCATION";
  }
  return "TEXT";
}

function isOnline() {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

function backoffMs(attempts: number) {
  const delay = INITIAL_BACKOFF_MS * 2 ** Math.max(0, attempts - 1);
  return Math.min(MAX_BACKOFF_MS, delay);
}

export function buildOptimisticMessage(
  payload: PendingChatSend,
  sendStatus: ChatMessageSendStatus = "sending",
): ChatMessage {
  return {
    id: `local-${payload.clientId}`,
    conversationId: payload.conversationId,
    type: messageTypeFor(payload),
    sender: payload.sender,
    text: payload.text.trim() || null,
    location: payload.location
      ? {
          lat: payload.location.lat,
          lng: payload.location.lng,
          label: payload.locationLabel.trim() || null,
        }
      : null,
    imageUrls: payload.localImageUrls,
    audioUrl: payload.localAudioUrl,
    audioDuration: payload.audioDuration,
    replyTo: payload.replyTo,
    reactions: [],
    poll: null,
    event: null,
    deleted: false,
    createdAt: new Date().toISOString(),
    clientId: payload.clientId,
    sendStatus,
  };
}

async function postPendingMessage(
  api: ApiClient,
  payload: PendingChatSend,
): Promise<ChatMessage> {
  if (payload.voiceFile) {
    const audioUrl = await uploadChatAudio(api, payload.voiceFile);
    return api.post<ChatMessage>(
      `/chat/conversations/${payload.conversationId}/messages`,
      {
        audioUrl,
        audioDuration: payload.audioDuration ?? undefined,
        replyToId: payload.replyTo?.id,
        clientMessageId: payload.clientId,
      },
    );
  }

  const imageUrls =
    payload.files.length > 0
      ? await uploadChatPhotos(api, payload.files)
      : undefined;

  return api.post<ChatMessage>(
    `/chat/conversations/${payload.conversationId}/messages`,
    {
      text: payload.text.trim() || undefined,
      imageUrls,
      location: payload.location
        ? {
            lat: payload.location.lat,
            lng: payload.location.lng,
            label: payload.locationLabel.trim() || undefined,
          }
        : undefined,
      replyToId: payload.replyTo?.id,
      clientMessageId: payload.clientId,
    },
  );
}

function revokeLocalMedia(payload: PendingChatSend) {
  for (const url of payload.localImageUrls) {
    if (url.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
  }
  if (payload.localAudioUrl?.startsWith("blob:")) {
    URL.revokeObjectURL(payload.localAudioUrl);
  }
}

function markSendStatus(
  queryClient: QueryClient,
  payload: PendingChatSend,
  sendStatus: ChatMessageSendStatus,
) {
  updateMessagesInCache(queryClient, payload.conversationId, (message) =>
    message.clientId === payload.clientId
      ? { ...message, sendStatus }
      : message,
  );
}

function clearFlushTimer() {
  if (flushTimer !== null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
}

function scheduleFlush(delayMs: number) {
  if (!flushDeps) {
    return;
  }
  clearFlushTimer();
  flushTimer = setTimeout(
    () => {
      flushTimer = null;
      if (!flushDeps) {
        return;
      }
      void flushOutbox(flushDeps.api, flushDeps.queryClient);
    },
    Math.max(0, delayMs),
  );
}

function isRetryableError(error: unknown) {
  if (!(error instanceof ApiError)) {
    return true;
  }
  if (error.status === 409) {
    return false;
  }
  return error.status >= 500 || error.status === 0 || error.status === 408;
}

export function discardPendingSend(queryClient: QueryClient, clientId: string) {
  const entry = pendingSends.get(clientId);
  if (!entry) {
    return;
  }
  pendingSends.delete(clientId);
  removeMessageFromCache(
    queryClient,
    entry.payload.conversationId,
    `local-${clientId}`,
  );
  revokeLocalMedia(entry.payload);
}

export async function deliverPendingSend(
  api: ApiClient,
  queryClient: QueryClient,
  payload: PendingChatSend,
) {
  const existing = pendingSends.get(payload.clientId);
  const entry: OutboxEntry = existing ?? {
    payload,
    attempts: 0,
    nextAttemptAt: 0,
    enqueueOrder: ++enqueueSeq,
    status: "sending",
  };
  entry.payload = payload;
  entry.status = "sending";
  pendingSends.set(payload.clientId, entry);
  markSendStatus(queryClient, payload, "sending");

  try {
    const message = await postPendingMessage(api, payload);
    pendingSends.delete(payload.clientId);
    revokeLocalMedia(payload);
    replaceOptimisticMessage(queryClient, payload.clientId, message);
    void queryClient.invalidateQueries({ queryKey: chatConversationsKey });
    return message;
  } catch (error) {
    if (isRetryableError(error)) {
      entry.attempts += 1;
      entry.nextAttemptAt = Date.now() + backoffMs(entry.attempts);
      entry.status = "queued";
      pendingSends.set(payload.clientId, entry);
      markSendStatus(queryClient, payload, "queued");
      scheduleFlush(entry.nextAttemptAt - Date.now());
    } else {
      entry.status = "failed";
      pendingSends.set(payload.clientId, entry);
      markSendStatus(queryClient, payload, "failed");
    }
    throw error;
  }
}

export function queueOptimisticSend(
  queryClient: QueryClient,
  payload: PendingChatSend,
  options?: { sendStatus?: ChatMessageSendStatus },
) {
  const sendStatus = options?.sendStatus ?? (isOnline() ? "sending" : "queued");
  pendingSends.set(payload.clientId, {
    payload,
    attempts: 0,
    nextAttemptAt: 0,
    enqueueOrder: ++enqueueSeq,
    status: sendStatus,
  });
  appendMessageToCache(
    queryClient,
    buildOptimisticMessage(payload, sendStatus),
  );
  void queryClient.invalidateQueries({ queryKey: chatConversationsKey });
}

export async function retryPendingSend(
  api: ApiClient,
  queryClient: QueryClient,
  clientId: string,
) {
  const entry = pendingSends.get(clientId);
  if (!entry) {
    throw new Error("Nothing to resend.");
  }
  entry.attempts = 0;
  entry.nextAttemptAt = 0;
  entry.status = "sending";
  pendingSends.set(clientId, entry);
  return deliverPendingSend(api, queryClient, entry.payload);
}

export function getPendingSend(clientId: string) {
  return pendingSends.get(clientId)?.payload ?? null;
}

export function listPendingSends() {
  return [...pendingSends.values()]
    .sort((a, b) => a.enqueueOrder - b.enqueueOrder)
    .map((entry) => entry.payload);
}

/** @internal test helper */
export function resetOutboxForTests() {
  pendingSends.clear();
  enqueueSeq = 0;
  flushing = false;
  clearFlushTimer();
  flushDeps = null;
}

export function bindOutboxFlushDeps(api: ApiClient, queryClient: QueryClient) {
  flushDeps = { api, queryClient };
}

export async function flushOutbox(api: ApiClient, queryClient: QueryClient) {
  bindOutboxFlushDeps(api, queryClient);

  if (flushing || !isOnline()) {
    return;
  }

  flushing = true;
  try {
    const now = Date.now();
    const ready = [...pendingSends.values()]
      .filter(
        (entry) =>
          entry.status !== "failed" &&
          entry.status !== "sending" &&
          entry.nextAttemptAt <= now,
      )
      .sort((a, b) => {
        if (a.payload.conversationId !== b.payload.conversationId) {
          return a.payload.conversationId.localeCompare(
            b.payload.conversationId,
          );
        }
        return a.enqueueOrder - b.enqueueOrder;
      });

    const byConversation = new Map<string, OutboxEntry[]>();
    for (const entry of ready) {
      const list = byConversation.get(entry.payload.conversationId) ?? [];
      list.push(entry);
      byConversation.set(entry.payload.conversationId, list);
    }

    for (const entries of byConversation.values()) {
      for (const entry of entries) {
        if (!pendingSends.has(entry.payload.clientId) || !isOnline()) {
          break;
        }
        try {
          await deliverPendingSend(api, queryClient, entry.payload);
        } catch {
          break;
        }
      }
    }
  } finally {
    flushing = false;
  }

  const nextAt = [...pendingSends.values()]
    .filter((entry) => entry.status === "queued")
    .map((entry) => entry.nextAttemptAt)
    .filter((at) => at > Date.now())
    .sort((a, b) => a - b)[0];

  if (nextAt !== undefined && isOnline()) {
    scheduleFlush(nextAt - Date.now());
  }
}
