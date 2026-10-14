import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type { ChatMessage, ChatMessagesPage } from "@/modules/chat/types";

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
