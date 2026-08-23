import { useOnlineStatus } from "@dev-ui/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useEffect } from "react";
import type { Socket } from "socket.io-client";
import {
  appendMessageToCache,
  chatConversationsKey,
  updateMessagesInCache,
} from "@/lib/chat-cache";
import { getApiBaseUrl } from "@/lib/constants";
import { chatSocketStore } from "@/lib/realtime-socket-store";
import { useApi } from "@/lib/use-api";
import { useAuth } from "@/lib/use-auth";
import { mergeEventWithPendingRsvp } from "@/modules/chat/optimistic-rsvp";
import {
  bindOutboxFlushDeps,
  flushOutbox,
} from "@/modules/chat/optimistic-send";
import type {
  ChatEventInfo,
  ChatMessage,
  ChatPoll,
  ChatReaction,
} from "@/modules/chat/types";

function setChatSocket(socket: Socket | null) {
  chatSocketStore.setState({ socket });
}

export function ChatSocketProvider({ children }: { children: ReactNode }) {
  const { user, getIdToken, loading: authLoading } = useAuth();
  const api = useApi();
  const queryClient = useQueryClient();
  const online = useOnlineStatus();
  const userId = user?.id ?? null;

  useEffect(() => {
    bindOutboxFlushDeps(api, queryClient);
  }, [api, queryClient]);

  useEffect(() => {
    if (!userId || !online) {
      return;
    }
    void flushOutbox(api, queryClient);
  }, [userId, online, api, queryClient]);

  useEffect(() => {
    if (!userId || authLoading) {
      return;
    }

    let active = true;
    let created: Socket | null = null;

    void Promise.all([getIdToken(), import("socket.io-client")]).then(
      ([token, { io }]) => {
        if (!active || !token) {
          return;
        }

        created = io(`${getApiBaseUrl()}/chat`, {
          auth: { token },
          transports: ["websocket", "polling"],
          reconnectionAttempts: 2,
        });

        // Effect may have cleaned up between the active check and io().
        if (!active) {
          created.disconnect();
          created = null;
          return;
        }

        created.on("connect_error", () => {
          if (!created || !active) {
            return;
          }
          created.io.opts.reconnection = false;
          created.disconnect();
        });

        created.on("message.new", ({ message }: { message: ChatMessage }) => {
          appendMessageToCache(queryClient, message);
          void queryClient.invalidateQueries({
            queryKey: chatConversationsKey,
          });
        });

        created.on(
          "message.deleted",
          (payload: { conversationId: string; messageId: string }) => {
            updateMessagesInCache(
              queryClient,
              payload.conversationId,
              (message) =>
                message.id === payload.messageId
                  ? {
                      ...message,
                      deleted: true,
                      text: null,
                      location: null,
                      imageUrls: [],
                      audioUrl: null,
                      audioDuration: null,
                    }
                  : message,
            );
          },
        );

        created.on(
          "reaction.updated",
          (payload: {
            conversationId: string;
            messageId: string;
            reactions: ChatReaction[];
          }) => {
            updateMessagesInCache(
              queryClient,
              payload.conversationId,
              (message) =>
                message.id === payload.messageId
                  ? { ...message, reactions: payload.reactions }
                  : message,
            );
          },
        );

        created.on(
          "poll.updated",
          (payload: {
            conversationId: string;
            messageId: string;
            poll: ChatPoll;
          }) => {
            updateMessagesInCache(
              queryClient,
              payload.conversationId,
              (message) =>
                message.id === payload.messageId
                  ? { ...message, poll: payload.poll }
                  : message,
            );
          },
        );

        created.on(
          "event.updated",
          (payload: {
            conversationId: string;
            messageId: string;
            event: ChatEventInfo;
          }) => {
            updateMessagesInCache(
              queryClient,
              payload.conversationId,
              (message) =>
                message.id === payload.messageId
                  ? {
                      ...message,
                      event: userId
                        ? mergeEventWithPendingRsvp(payload.event, userId)
                        : payload.event,
                    }
                  : message,
            );
          },
        );

        created.on("conversation.updated", () => {
          void queryClient.invalidateQueries({
            queryKey: chatConversationsKey,
          });
        });

        setChatSocket(created);
      },
    );

    return () => {
      active = false;
      created?.disconnect();
      created = null;
      setChatSocket(null);
    };
  }, [userId, authLoading, getIdToken, queryClient]);

  return children;
}
