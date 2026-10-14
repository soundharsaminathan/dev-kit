import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/lib/api-context";
import { ApiState } from "@/modules/ui/api-state";
import styles from "./batch-chat.module.scss";
import { ChatView } from "./chat-view";
import type { ChatConversation } from "./types";

export function BatchChat({ batchId }: { batchId: string }) {
  const api = useApi();

  const query = useQuery({
    queryKey: ["batch-conversation", batchId],
    queryFn: () =>
      api.get<ChatConversation>(`/chat/batches/${batchId}/conversation`),
  });

  return (
    <ApiState
      isLoading={query.isLoading}
      isError={query.isError}
      error={query.error}
      data={query.data}
      emptyTitle="Chat unavailable"
      emptyDescription="This batch does not have a chat yet."
    >
      {(conversation) => (
        <div className={styles.shell}>
          <ChatView conversationId={conversation.id} />
        </div>
      )}
    </ApiState>
  );
}
