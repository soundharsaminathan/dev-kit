import { type ChatConversation, conversationDisplayName } from "./types";

export type ConversationFilter = "all" | "unread" | "group";

export const CONVERSATION_FILTERS: { id: ConversationFilter; label: string }[] =
  [
    { id: "all", label: "All" },
    { id: "unread", label: "Unread" },
    { id: "group", label: "Group" },
  ];

export function isGroupConversation(conversation: ChatConversation) {
  return conversation.type === "GROUP" || conversation.type === "BATCH";
}

export function isUnreadConversation(conversation: ChatConversation) {
  return Number(conversation.unreadCount) > 0;
}

function matchesSearch(
  conversation: ChatConversation,
  query: string,
  currentUserId: string,
) {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return true;
  }
  const title = conversationDisplayName(conversation, currentUserId);
  return title.toLowerCase().includes(trimmed);
}

export function filterConversations(
  conversations: ChatConversation[],
  filter: ConversationFilter,
  query: string,
  currentUserId: string,
) {
  return conversations.filter((conversation) => {
    if (filter === "unread" && !isUnreadConversation(conversation)) {
      return false;
    }
    if (filter === "group" && !isGroupConversation(conversation)) {
      return false;
    }
    return matchesSearch(conversation, query, currentUserId);
  });
}
