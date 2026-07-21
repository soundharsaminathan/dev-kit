import { Text } from "@dev-ui/components/text";
import { Icon } from "@dev-ui/icons";
import { ChatView } from "./chat-view";
import { ConversationList } from "./conversation-list";
import styles from "./messages-page.module.scss";

type MessagesPageProps = {
  conversationId?: string;
  onSelect: (conversationId: string) => void;
  onBack: () => void;
};

export function MessagesPage({
  conversationId,
  onSelect,
  onBack,
}: MessagesPageProps) {
  return (
    <section className={styles.page}>
      <div
        className={styles.layout}
        data-view={conversationId ? "chat" : "list"}
      >
        <div className={styles.sidebar}>
          <ConversationList activeId={conversationId} onSelect={onSelect} />
        </div>
        <div className={styles.main}>
          {conversationId ? (
            <ChatView conversationId={conversationId} onBack={onBack} />
          ) : (
            <div className={styles.placeholder}>
              <Icon name="message-square" className={styles.placeholderIcon} />
              <Text slot="description">
                Pick a conversation, or start a new one.
              </Text>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
