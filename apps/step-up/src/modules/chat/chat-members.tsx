import { Avatar, AvatarFallback, AvatarImage } from "@dev-ui/components/avatar";
import { Badge } from "@dev-ui/components/badge";
import { Button } from "@dev-ui/components/button";
import { Text } from "@dev-ui/components/text";
import { Icon } from "@dev-ui/icons";
import { useMemo } from "react";
import styles from "./chat-members.module.scss";
import { ChatTooltip } from "./chat-tooltip";
import type { ChatConversation, ChatMember } from "./types";

const STUDIO_ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  STAFF: "Staff",
  TRAINER: "Trainer",
  STUDENT: "Student",
  PARENT: "Parent",
};

type ChatMembersViewProps = {
  conversation: ChatConversation;
  currentUserId: string;
  onBack: () => void;
};

function studioRoleLabel(role: string) {
  return STUDIO_ROLE_LABELS[role] ?? role;
}

function sortMembers(members: ChatMember[], currentUserId: string) {
  return [...members].sort((a, b) => {
    if (a.role !== b.role) {
      return a.role === "ADMIN" ? -1 : 1;
    }
    if (a.user.id === currentUserId) {
      return -1;
    }
    if (b.user.id === currentUserId) {
      return 1;
    }
    return a.user.name.localeCompare(b.user.name);
  });
}

export function ChatMembersView({
  conversation,
  currentUserId,
  onBack,
}: ChatMembersViewProps) {
  const members = useMemo(
    () => sortMembers(conversation.members, currentUserId),
    [conversation.members, currentUserId],
  );

  const count = members.length;

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <ChatTooltip label="Back">
          <Button
            variant="quiet"
            size="sm"
            isIconOnly
            aria-label="Back"
            onClick={onBack}
          >
            <Icon name="arrow-left" />
          </Button>
        </ChatTooltip>
        <div className={styles.headerText}>
          <span className={styles.headerTitle}>Members</span>
          <span className={styles.headerSub}>
            {count} member{count === 1 ? "" : "s"}
          </span>
        </div>
      </header>

      {members.length === 0 ? (
        <div className={styles.empty}>
          <Text slot="description">No members in this group yet.</Text>
        </div>
      ) : (
        <ul className={styles.list}>
          {members.map((member) => {
            const isYou = member.user.id === currentUserId;
            return (
              <li key={member.user.id} className={styles.item}>
                <Avatar size="sm">
                  {member.user.photoUrl ? (
                    <AvatarImage
                      src={member.user.photoUrl}
                      alt={member.user.name}
                    />
                  ) : null}
                  <AvatarFallback>
                    {member.user.name.slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                <span className={styles.itemBody}>
                  <span className={styles.itemTop}>
                    <span className={styles.itemName}>{member.user.name}</span>
                    {isYou ? <span className={styles.you}>You</span> : null}
                  </span>
                  <span className={styles.itemMeta}>
                    {studioRoleLabel(member.user.role)}
                  </span>
                </span>
                {member.role === "ADMIN" ? (
                  <Badge appearance="subtle" className={styles.roleBadge}>
                    Admin
                  </Badge>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
