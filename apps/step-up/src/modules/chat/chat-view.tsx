import { Avatar, AvatarFallback, AvatarImage } from "@dev-ui/components/avatar";
import { Button } from "@dev-ui/components/button";
import { Text } from "@dev-ui/components/text";
import { useToastContext } from "@dev-ui/components/toast";
import {
  captureQuerySnapshot,
  restoreQuerySnapshot,
  useOptimisticMutation,
} from "@dev-ui/hooks";
import { Icon } from "@dev-ui/icons";
import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import {
  chatConversationsKey,
  chatMessagesKey,
  updateMessagesInCache,
  useChatSocket,
} from "@/lib/chat-socket";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import { ChatMembersView } from "./chat-members";
import { ChatTooltip } from "./chat-tooltip";
import styles from "./chat-view.module.scss";
import { Composer } from "./composer";
import { MessageBubble } from "./message-bubble";
import { toggleReactionOptimistically } from "./optimistic-reactions";
import {
  applyRsvpOptimistically,
  clearPendingRsvp,
  getPendingRsvp,
  isCurrentPendingRsvp,
  mergeEventWithPendingRsvp,
  setPendingRsvp,
} from "./optimistic-rsvp";
import { discardPendingSend, retryPendingSend } from "./optimistic-send";
import {
  type ChatConversation,
  type ChatEventInfo,
  type ChatMessage,
  type ChatMessagesPage,
  type ChatPoll,
  type ChatReaction,
  type ChatRsvpStatus,
  conversationAvatarUser,
  conversationDisplayName,
} from "./types";

const MESSAGE_SKELETONS = [
  { id: "sk-0", mine: false, width: "58%", height: "2.75rem" },
  { id: "sk-1", mine: true, width: "42%", height: "2.25rem" },
  { id: "sk-2", mine: false, width: "68%", height: "2.25rem" },
  { id: "sk-3", mine: true, width: "52%", height: "3.25rem" },
  { id: "sk-4", mine: false, width: "36%", height: "2.25rem" },
  { id: "sk-5", mine: true, width: "46%", height: "2.25rem" },
  { id: "sk-6", mine: false, width: "62%", height: "3.25rem" },
  { id: "sk-7", mine: true, width: "38%", height: "2.25rem" },
] as const;

type ChatViewProps = {
  conversationId: string;
  onBack?: () => void;
};

function useChatMessages(conversationId: string) {
  const api = useApi();
  return useInfiniteQuery({
    queryKey: chatMessagesKey(conversationId),
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams();
      if (pageParam) {
        params.set("cursor", pageParam);
      }
      const query = params.toString();
      return api.get<ChatMessagesPage>(
        `/chat/conversations/${conversationId}/messages${query ? `?${query}` : ""}`,
      );
    },
    initialPageParam: "",
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

function useMessageActions(conversationId: string) {
  const api = useApi();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToastContext("useMessageActions");
  const currentUserId = user?.id ?? "";

  const reactionMutation = useOptimisticMutation({
    mutationFn: ({
      messageId,
      emoji,
      active,
    }: {
      messageId: string;
      emoji: string;
      active: boolean;
    }) =>
      active
        ? api.delete<ChatReaction[]>(
            `/chat/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`,
          )
        : api.post<ChatReaction[]>(`/chat/messages/${messageId}/reactions`, {
            emoji,
          }),
    onOptimistic: async (variables) => {
      const snapshot = await captureQuerySnapshot<
        InfiniteData<ChatMessagesPage>
      >(queryClient, chatMessagesKey(conversationId));

      updateMessagesInCache(queryClient, conversationId, (message) =>
        message.id === variables.messageId
          ? {
              ...message,
              reactions: toggleReactionOptimistically(
                message.reactions,
                variables.emoji,
                variables.active,
                currentUserId,
              ),
            }
          : message,
      );

      return snapshot;
    },
    onRollback: (snapshot) => restoreQuerySnapshot(queryClient, snapshot),
    onError: (error: unknown) => {
      toast({
        title: "Reaction failed",
        description:
          error instanceof Error
            ? error.message
            : "Could not update reaction. Try again.",
        variant: "error",
      });
    },
    onSuccess: (reactions, variables) => {
      updateMessagesInCache(queryClient, conversationId, (message) =>
        message.id === variables.messageId
          ? { ...message, reactions }
          : message,
      );
    },
  });

  const voteMutation = useMutation({
    mutationFn: ({
      pollId,
      optionIds,
    }: {
      pollId: string;
      optionIds: string[];
    }) => api.post<ChatPoll>(`/chat/polls/${pollId}/votes`, { optionIds }),
    onSuccess: (poll) => {
      updateMessagesInCache(queryClient, conversationId, (message) =>
        message.poll?.id === poll.id ? { ...message, poll } : message,
      );
    },
  });

  const rsvpTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const rsvpBaselines = useRef(new Map<string, ChatEventInfo>());

  const rsvpMutation = useMutation({
    mutationFn: ({
      eventId,
      status,
    }: {
      eventId: string;
      status: ChatRsvpStatus;
      generation: number;
      conversationId: string;
    }) => api.post<ChatEventInfo>(`/chat/events/${eventId}/rsvp`, { status }),
    onSuccess: (event, variables) => {
      const current = isCurrentPendingRsvp(
        variables.eventId,
        variables.generation,
      );
      updateMessagesInCache(
        queryClient,
        variables.conversationId,
        (message) => {
          if (message.event?.id !== event.id) {
            return message;
          }
          return {
            ...message,
            event: current
              ? event
              : mergeEventWithPendingRsvp(event, currentUserId),
          };
        },
      );
      if (current) {
        clearPendingRsvp(variables.eventId, variables.generation);
        rsvpBaselines.current.delete(variables.eventId);
      }
    },
    onError: (error: unknown, variables) => {
      if (!isCurrentPendingRsvp(variables.eventId, variables.generation)) {
        return;
      }
      const baseline = rsvpBaselines.current.get(variables.eventId);
      if (baseline) {
        updateMessagesInCache(
          queryClient,
          variables.conversationId,
          (message) =>
            message.event?.id === variables.eventId
              ? { ...message, event: baseline }
              : message,
        );
      }
      clearPendingRsvp(variables.eventId, variables.generation);
      rsvpBaselines.current.delete(variables.eventId);
      toast({
        title: "RSVP failed",
        description:
          error instanceof Error
            ? error.message
            : "Could not update RSVP. Try again.",
        variant: "error",
      });
    },
  });

  function queueRsvp(eventId: string, status: ChatRsvpStatus) {
    if (!rsvpBaselines.current.has(eventId)) {
      const data = queryClient.getQueryData<InfiniteData<ChatMessagesPage>>(
        chatMessagesKey(conversationId),
      );
      const current = data?.pages
        .flatMap((page) => page.messages)
        .find((message) => message.event?.id === eventId)?.event;
      if (current) {
        rsvpBaselines.current.set(eventId, {
          ...current,
          rsvps: {
            GOING: [...(current.rsvps.GOING ?? [])],
            MAYBE: [...(current.rsvps.MAYBE ?? [])],
            DECLINED: [...(current.rsvps.DECLINED ?? [])],
          },
        });
      }
    }

    setPendingRsvp(eventId, status, currentUserId);
    updateMessagesInCache(queryClient, conversationId, (message) => {
      if (message.event?.id !== eventId) {
        return message;
      }
      return {
        ...message,
        event: applyRsvpOptimistically(message.event, status, currentUserId),
      };
    });

    const existing = rsvpTimers.current.get(eventId);
    if (existing) {
      clearTimeout(existing);
    }
    rsvpTimers.current.set(
      eventId,
      setTimeout(() => {
        rsvpTimers.current.delete(eventId);
        const pending = getPendingRsvp(eventId);
        if (!pending) {
          return;
        }
        rsvpMutation.mutate({
          eventId,
          status: pending.status,
          generation: pending.generation,
          conversationId,
        });
      }, 200),
    );
  }

  useEffect(() => {
    const timers = rsvpTimers.current;
    const mutate = rsvpMutation.mutate;
    return () => {
      for (const [eventId, timer] of timers) {
        clearTimeout(timer);
        const pending = getPendingRsvp(eventId);
        if (pending) {
          mutate({
            eventId,
            status: pending.status,
            generation: pending.generation,
            conversationId,
          });
        }
      }
      timers.clear();
    };
  }, [conversationId, rsvpMutation.mutate]);

  const deleteMutation = useMutation({
    mutationFn: (messageId: string) =>
      api.delete(`/chat/messages/${messageId}`),
    onSuccess: (_data, messageId) => {
      updateMessagesInCache(queryClient, conversationId, (message) =>
        message.id === messageId
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
  });

  return { reactionMutation, voteMutation, queueRsvp, deleteMutation };
}

function dayLabel(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) {
    return "Today";
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function MessageList({
  conversationId,
  conversation,
  onReply,
  highlightedMessageId,
  onJumpToReply,
}: {
  conversationId: string;
  conversation: ChatConversation | undefined;
  onReply?: (message: ChatMessage) => void;
  highlightedMessageId?: string | null;
  onJumpToReply?: (messageId: string) => void;
}) {
  const { user } = useAuth();
  const api = useApi();
  const queryClient = useQueryClient();
  const currentUserId = user?.id ?? "";
  const messagesQuery = useChatMessages(conversationId);
  const { reactionMutation, voteMutation, queueRsvp, deleteMutation } =
    useMessageActions(conversationId);

  const resendMutation = useMutation({
    mutationFn: (clientId: string) =>
      retryPendingSend(api, queryClient, clientId),
  });

  const messages = useMemo(
    () =>
      [...(messagesQuery.data?.pages ?? [])]
        .reverse()
        .flatMap((page) => page.messages),
    [messagesQuery.data],
  );

  const listRef = useRef<HTMLDivElement | null>(null);
  const lastMessageId = messages[messages.length - 1]?.id;
  const scrolledTo = useRef<string | null>(null);

  useEffect(() => {
    const anchor = `${conversationId}:${lastMessageId ?? ""}`;
    if (scrolledTo.current === anchor) {
      return;
    }
    scrolledTo.current = anchor;
    const node = listRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  });

  useEffect(() => {
    if (!highlightedMessageId || !listRef.current) {
      return;
    }
    const target = listRef.current.querySelector(
      `[data-message-id="${highlightedMessageId}"]`,
    );
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightedMessageId]);

  const isGroup = conversation ? conversation.type !== "DM" : true;
  const isAdmin = conversation?.myRole === "ADMIN";

  if (messagesQuery.isLoading) {
    return (
      <div
        className={styles.listLoading}
        role="status"
        aria-label="Loading messages"
      >
        {MESSAGE_SKELETONS.map((bubble) => (
          <div
            key={bubble.id}
            className={styles.skeletonRow}
            data-mine={bubble.mine || undefined}
          >
            {!bubble.mine ? (
              <SkeletonBlock
                className={styles.skeletonFill}
                height="1.75rem"
                width="1.75rem"
                radius="999px"
              />
            ) : null}
            <div
              className={styles.skeletonBubble}
              style={{ width: bubble.width, height: bubble.height }}
            >
              <SkeletonBlock
                className={styles.skeletonFill}
                height="100%"
                width="100%"
                radius="0"
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.list} ref={listRef}>
      {messagesQuery.hasNextPage ? (
        <div className={styles.loadOlder}>
          <Button
            size="sm"
            variant="quiet"
            isPending={messagesQuery.isFetchingNextPage}
            onClick={() => void messagesQuery.fetchNextPage()}
          >
            Load older messages
          </Button>
        </div>
      ) : null}

      {messages.length === 0 ? (
        <div className={styles.emptyList}>
          <Text slot="description">No messages yet. Say hi!</Text>
        </div>
      ) : null}

      {messages.map((message, index) => {
        const previous = messages[index - 1];
        const newDay =
          !previous ||
          new Date(previous.createdAt).toDateString() !==
            new Date(message.createdAt).toDateString();
        const showSender =
          isGroup &&
          message.type !== "SYSTEM" &&
          (!previous ||
            previous.type === "SYSTEM" ||
            previous.sender.id !== message.sender.id ||
            newDay);

        return (
          <div
            key={message.id}
            className={styles.item}
            data-message-id={message.id}
          >
            {newDay ? (
              <div className={styles.daySeparator}>
                <span>{dayLabel(message.createdAt)}</span>
              </div>
            ) : null}
            {message.type === "SYSTEM" ? (
              <div
                className={styles.systemNotice}
                data-testid="chat-system-notice"
              >
                <span>{message.text || "Update"}</span>
              </div>
            ) : (
              <MessageBubble
                message={message}
                currentUserId={currentUserId}
                showSender={showSender}
                canDelete={message.sender.id === currentUserId || isAdmin}
                highlighted={highlightedMessageId === message.id}
                onToggleReaction={(emoji, active) =>
                  reactionMutation.mutate({
                    messageId: message.id,
                    emoji,
                    active,
                  })
                }
                onReply={onReply}
                onJumpToReply={onJumpToReply}
                onDelete={(target) => {
                  if (target.clientId && target.sendStatus) {
                    discardPendingSend(queryClient, target.clientId);
                    return;
                  }
                  deleteMutation.mutate(target.id);
                }}
                onResend={(target) => {
                  if (target.clientId) {
                    resendMutation.mutate(target.clientId);
                  }
                }}
                resendPending={
                  resendMutation.isPending &&
                  resendMutation.variables === message.clientId
                }
                onVote={(pollId, optionIds) =>
                  voteMutation.mutate({ pollId, optionIds })
                }
                onRsvp={(eventId, status) => queueRsvp(eventId, status)}
                votePending={voteMutation.isPending}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ChatView({ conversationId, onBack }: ChatViewProps) {
  const api = useApi();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { socket } = useChatSocket();
  const currentUserId = user?.id ?? "";

  const conversationQuery = useQuery({
    queryKey: ["chat-conversation", conversationId],
    queryFn: () =>
      api.get<ChatConversation>(`/chat/conversations/${conversationId}`),
  });
  const conversation = conversationQuery.data;

  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<
    string | null
  >(null);
  const [typingUsers, setTypingUsers] = useState<Record<string, number>>({});
  const [showMembers, setShowMembers] = useState(false);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateForConversation = useRef(conversationId);

  if (stateForConversation.current !== conversationId) {
    stateForConversation.current = conversationId;
    setReplyTo(null);
    setHighlightedMessageId(null);
    setTypingUsers({});
    setShowMembers(false);
  }

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!socket) {
      return;
    }
    socket.emit("conversation.join", { conversationId });

    function onTyping(payload: {
      conversationId: string;
      userId: string;
      typing: boolean;
    }) {
      if (payload.conversationId !== conversationId) {
        return;
      }
      setTypingUsers((current) => {
        const next = { ...current };
        if (payload.typing) {
          next[payload.userId] = Date.now();
        } else {
          delete next[payload.userId];
        }
        return next;
      });
    }

    socket.on("typing", onTyping);
    return () => {
      socket.off("typing", onTyping);
    };
  }, [socket, conversationId]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTypingUsers((current) => {
        const cutoff = Date.now() - 4000;
        const entries = Object.entries(current).filter(
          ([, time]) => time > cutoff,
        );
        if (entries.length === Object.keys(current).length) {
          return current;
        }
        return Object.fromEntries(entries);
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const messagesData = queryClient.getQueryData(
    chatMessagesKey(conversationId),
  );

  useEffect(() => {
    if (!messagesData) {
      return;
    }
    void api
      .post(`/chat/conversations/${conversationId}/read`)
      .then(() =>
        Promise.all([
          queryClient.invalidateQueries({ queryKey: chatConversationsKey }),
          queryClient.invalidateQueries({ queryKey: ["batch-conversation"] }),
        ]),
      )
      .catch(() => undefined);
  }, [api, queryClient, conversationId, messagesData]);

  function jumpToReply(messageId: string) {
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
    }
    setHighlightedMessageId(messageId);
    highlightTimerRef.current = setTimeout(() => {
      setHighlightedMessageId(null);
    }, 1600);
  }

  const typingNames = conversation
    ? Object.keys(typingUsers)
        .filter((id) => id !== currentUserId)
        .map(
          (id) =>
            conversation.members.find((member) => member.user.id === id)?.user
              .name,
        )
        .filter(Boolean)
    : [];

  const title = conversation
    ? conversationDisplayName(conversation, currentUserId)
    : "…";
  const avatarUser = conversation
    ? conversationAvatarUser(conversation, currentUserId)
    : null;
  const canViewMembers = conversation != null && conversation.type !== "DM";
  const memberSubtitle =
    typingNames.length > 0
      ? `${typingNames.join(", ")} typing…`
      : conversation
        ? `${conversation.members.length} member${conversation.members.length === 1 ? "" : "s"}`
        : "";
  const headerIdentity = (
    <>
      <Avatar size="sm">
        {avatarUser?.photoUrl || conversation?.imageUrl ? (
          <AvatarImage
            src={(avatarUser?.photoUrl ?? conversation?.imageUrl) as string}
            alt={title}
          />
        ) : null}
        <AvatarFallback>{title.slice(0, 1)}</AvatarFallback>
      </Avatar>
      <div className={styles.headerText}>
        <span className={styles.headerTitle}>{title}</span>
        <span className={styles.headerSub}>{memberSubtitle}</span>
      </div>
    </>
  );

  if (showMembers && conversation) {
    return (
      <ChatMembersView
        conversation={conversation}
        currentUserId={currentUserId}
        onBack={() => setShowMembers(false)}
      />
    );
  }

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        {onBack ? (
          <ChatTooltip label="Back">
            <Button
              variant="quiet"
              size="sm"
              isIconOnly
              aria-label="Back"
              onClick={onBack}
              className={styles.backButton}
            >
              <Icon name="arrow-left" />
            </Button>
          </ChatTooltip>
        ) : null}

        {canViewMembers ? (
          <button
            type="button"
            className={styles.headerMain}
            onClick={() => setShowMembers(true)}
            aria-label={`View members of ${title}`}
          >
            {headerIdentity}
          </button>
        ) : (
          <div className={styles.headerMain}>{headerIdentity}</div>
        )}

        {canViewMembers ? (
          <ChatTooltip label="Members">
            <Button
              variant="quiet"
              size="sm"
              isIconOnly
              aria-label="View members"
              onClick={() => setShowMembers(true)}
              className={styles.membersButton}
            >
              <Icon name="users" />
            </Button>
          </ChatTooltip>
        ) : null}
      </header>

      <div className={styles.body}>
        <MessageList
          conversationId={conversationId}
          conversation={conversation}
          onReply={(message) => setReplyTo(message)}
          highlightedMessageId={highlightedMessageId}
          onJumpToReply={jumpToReply}
        />
      </div>

      <Composer
        conversationId={conversationId}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
      />
    </div>
  );
}
