import { useOnlineStatus } from "@dev-ui/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import {
  appendMessageToCache,
  chatConversationsKey,
  updateMessagesInCache,
} from "@/lib/chat-cache";
import { ChatSocketContext } from "@/lib/chat-socket-context";
import { getApiBaseUrl } from "@/lib/constants";
import { useApi } from "@/lib/use-api";
import { useAuth } from "@/lib/use-auth";
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

export function ChatSocketProvider({ children }: { children: ReactNode }) {
  const { user, getIdToken, loading: authLoading } = useAuth();
  const api = useApi();
  const queryClient = useQueryClient();
  const online = useOnlineStatus();
  const [socket, setSocket] = useState<Socket | null>(null);
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

        created.on("connect_error", () => {
          if (!created) {
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
                  ? { ...message, event: payload.event }
                  : message,
            );
          },
        );

        created.on("conversation.updated", () => {
          void queryClient.invalidateQueries({
            queryKey: chatConversationsKey,
          });
        });

        setSocket(created);
      },
    );

    return () => {
      active = false;
      created?.disconnect();
      setSocket(null);
    };
  }, [userId, authLoading, getIdToken, queryClient]);

  return (
    <ChatSocketContext.Provider value={{ socket }}>
      {children}
    </ChatSocketContext.Provider>
  );
}
