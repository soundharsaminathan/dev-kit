export type ChatUser = {
  id: string;
  name: string;
  photoUrl?: string | null;
  role: string;
};

export type ChatConversationType = "DM" | "GROUP" | "BATCH";

export type ChatMessageKind =
  | "TEXT"
  | "IMAGE"
  | "AUDIO"
  | "POLL"
  | "EVENT"
  | "LOCATION"
  | "SYSTEM";

export type ChatReaction = {
  emoji: string;
  count: number;
  userIds: string[];
};

export type ChatPollOption = {
  id: string;
  label: string;
  voterIds: string[];
  count: number;
};

export type ChatPoll = {
  id: string;
  question: string;
  multiSelect: boolean;
  closesAt: string | null;
  options: ChatPollOption[];
  totalVotes: number;
};

export type ChatRsvpStatus = "GOING" | "MAYBE" | "DECLINED";

export type ChatEventInfo = {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  locationLabel: string | null;
  latitude: number | null;
  longitude: number | null;
  rsvps: Record<ChatRsvpStatus, string[]>;
};

export type ChatLocation = {
  lat: number;
  lng: number;
  label?: string | null;
};

export type ChatReply = {
  id: string;
  senderId: string;
  senderName: string;
  type: ChatMessageKind;
  text: string | null;
  deleted: boolean;
};

export type ChatMessageSendStatus = "queued" | "sending" | "failed";

export type ChatMessage = {
  id: string;
  conversationId: string;
  type: ChatMessageKind;
  sender: ChatUser;
  text: string | null;
  location: ChatLocation | null;
  imageUrls: string[];
  audioUrl: string | null;
  audioDuration: number | null;
  replyTo: ChatReply | null;
  reactions: ChatReaction[];
  poll: ChatPoll | null;
  event: ChatEventInfo | null;
  deleted: boolean;
  createdAt: string;
  clientId?: string | null;
  sendStatus?: ChatMessageSendStatus | null;
};

export type ChatMemberRole = "ADMIN" | "MEMBER";

export type ChatMember = {
  user: ChatUser;
  role: ChatMemberRole;
  lastReadAt: string | null;
};

export type ChatConversation = {
  id: string;
  type: ChatConversationType;
  title: string | null;
  imageUrl: string | null;
  batch: { id: string; name: string } | null;
  members: ChatMember[];
  myRole: ChatMemberRole | null;
  lastReadAt: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  lastMessage: ChatMessage | null;
  createdAt: string;
};

export type ChatMessagesPage = {
  messages: ChatMessage[];
  nextCursor: string | null;
};

export function conversationDisplayName(
  conversation: ChatConversation,
  viewerId: string,
) {
  if (conversation.title) {
    return conversation.title;
  }
  const others = conversation.members.filter(
    (member) => member.user.id !== viewerId,
  );
  if (others.length === 0) {
    return "Just you";
  }
  return others.map((member) => member.user.name).join(", ");
}

export function conversationAvatarUser(
  conversation: ChatConversation,
  viewerId: string,
): ChatUser | null {
  if (conversation.type !== "DM") {
    return null;
  }
  return (
    conversation.members.find((member) => member.user.id !== viewerId)?.user ??
    null
  );
}

export function messagePreview(message: ChatMessage | null) {
  if (!message) {
    return "No messages yet";
  }
  if (message.deleted) {
    return "Message deleted";
  }
  switch (message.type) {
    case "IMAGE":
      return message.text ? `📷 ${message.text}` : "📷 Photo";
    case "AUDIO":
      return "🎤 Voice message";
    case "POLL":
      return `📊 ${message.poll?.question ?? "Poll"}`;
    case "EVENT":
      return `📅 ${message.event?.title ?? "Event"}`;
    case "LOCATION":
      return "📍 Location";
    default:
      return message.text ?? "";
  }
}
