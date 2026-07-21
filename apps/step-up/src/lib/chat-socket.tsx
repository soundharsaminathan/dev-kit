import { useOnlineStatus } from "@dev-ui/hooks";
import {
  type InfiniteData,
  type QueryClient,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { io, type Socket } from "socket.io-client";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/constants";
import {
  bindOutboxFlushDeps,
  flushOutbox,
} from "@/modules/chat/optimistic-send";
import type {
  ChatEventInfo,
  ChatMessage,
  ChatMessagesPage,
  ChatPoll,
  ChatReaction,
} from "@/modules/chat/types";

type MessagesData = InfiniteData<ChatMessagesPage>;

export function chatMessagesKey(conversationId: string) {
  return ["chat-messages", conversationId];
}

export const chatConversationsKey = ["chat-conversations"];

export function updateMessagesInCache(
  queryClient: QueryClient,
  conversationId: string,
  updater: (message: ChatMessage) => ChatMessage,
) {
  queryClient.setQueryData<MessagesData>(
    chatMessagesKey(conversationId),
    (data) => {
      if (!data) {
        return data;
      }
      return {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          messages: page.messages.map(updater),
        })),
      };
    },
  );
}

export function appendMessageToCache(
  queryClient: QueryClient,
  message: ChatMessage,
) {
  queryClient.setQueryData<MessagesData>(
    chatMessagesKey(message.conversationId),
    (data) => {
      const latest = data?.pages[0];
      if (!data || !latest) {
        return data;
      }
      const exists = data.pages.some((page) =>
        page.messages.some((existing) => existing.id === message.id),
      );
      if (exists) {
        return data;
      }
      return {
        ...data,
        pages: [
          { ...latest, messages: [...latest.messages, message] },
          ...data.pages.slice(1),
        ],
      };
    },
  );
}

export function removeMessageFromCache(
  queryClient: QueryClient,
  conversationId: string,
  messageId: string,
) {
  queryClient.setQueryData<MessagesData>(
    chatMessagesKey(conversationId),
    (data) => {
      if (!data) {
        return data;
      }
      return {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          messages: page.messages.filter((message) => message.id !== messageId),
        })),
      };
    },
  );
}

export function replaceOptimisticMessage(
  queryClient: QueryClient,
  clientId: string,
  message: ChatMessage,
) {
  queryClient.setQueryData<MessagesData>(
    chatMessagesKey(message.conversationId),
    (data) => {
      if (!data) {
        return data;
      }

      const alreadyReal = data.pages.some((page) =>
        page.messages.some((existing) => existing.id === message.id),
      );

      return {
        ...data,
        pages: data.pages.map((page, pageIndex) => {
          const withoutOptimistic = page.messages.filter(
            (existing) => existing.clientId !== clientId,
          );
          if (alreadyReal) {
            return { ...page, messages: withoutOptimistic };
          }
          if (pageIndex === 0) {
            return {
              ...page,
              messages: [...withoutOptimistic, message],
            };
          }
          return { ...page, messages: withoutOptimistic };
        }),
      };
    },
  );
}

type ChatSocketContextValue = {
  socket: Socket | null;
};

const ChatSocketContext = createContext<ChatSocketContextValue>({
  socket: null,
});

export function ChatSocketProvider({ children }: { children: ReactNode }) {
  const { user, getIdToken } = useAuth();
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
    if (!userId) {
      return;
    }

    let active = true;
    let created: Socket | null = null;

    void getIdToken().then((token) => {
      if (!active || !token) {
        return;
      }

      created = io(`${getApiBaseUrl()}/chat`, {
        auth: { token },
        transports: ["websocket", "polling"],
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
        void queryClient.invalidateQueries({ queryKey: chatConversationsKey });
      });

      setSocket(created);
    });

    return () => {
      active = false;
      created?.disconnect();
      setSocket(null);
    };
  }, [userId, getIdToken, queryClient]);

  return (
    <ChatSocketContext.Provider value={{ socket }}>
      {children}
    </ChatSocketContext.Provider>
  );
}

export function useChatSocket() {
  return useContext(ChatSocketContext);
}
