import { useToastContext } from "@dev-ui/components/toast";
import { Icon } from "@dev-ui/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useApi } from "@/lib/api-context";
import styles from "./batch-chat-button.module.scss";
import type { ChatConversation } from "./types";

type BatchChatButtonProps = {
  batchId: string;
  messagesTo: "/me/messages/$id" | "/app/messages/$id";
  enabled?: boolean;
};

export function BatchChatButton({
  batchId,
  messagesTo,
  enabled = true,
}: BatchChatButtonProps) {
  const api = useApi();
  const navigate = useNavigate();
  const { toast } = useToastContext("BatchChatButton");

  const chatQuery = useQuery({
    queryKey: ["batch-conversation", batchId],
    queryFn: () =>
      api.get<ChatConversation>(`/chat/batches/${batchId}/conversation`),
    enabled,
  });

  const openChat = useMutation({
    mutationFn: async () => {
      if (chatQuery.data) return chatQuery.data;
      return api.get<ChatConversation>(
        `/chat/batches/${batchId}/conversation`,
      );
    },
    onSuccess: (conversation) => {
      void navigate({ to: messagesTo, params: { id: conversation.id } });
    },
    onError: (error) => {
      toast({
        title: "Couldn’t open chat",
        description:
          error instanceof Error ? error.message : "Try again in a moment.",
        variant: "error",
      });
    },
  });

  if (!enabled) return null;

  const unread = chatQuery.data?.unreadCount ?? 0;

  return (
    <button
      type="button"
      className={styles.button}
      aria-label={unread > 0 ? `Class chat, ${unread} unread` : "Class chat"}
      data-testid="batch-chat-button"
      disabled={openChat.isPending}
      onClick={() => openChat.mutate()}
    >
      <Icon name="message-square" aria-hidden />
      {unread > 0 ? (
        <span className={styles.unread}>{unread > 99 ? "99+" : unread}</span>
      ) : null}
    </button>
  );
}
