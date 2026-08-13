import { Avatar, AvatarFallback, AvatarImage } from "@dev-ui/components/avatar";
import { Button } from "@dev-ui/components/button";
import { SearchField } from "@dev-ui/components/search-field";
import { Text } from "@dev-ui/components/text";
import { useIsMobile } from "@dev-ui/hooks";
import { Icon } from "@dev-ui/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import { chatConversationsKey } from "@/lib/chat-socket";
import { STAFF_ROLES, type UserRole } from "@/lib/constants";
import { ENTITY_ICONS } from "@/lib/entity-icons";
import { ApiState } from "@/modules/ui/api-state";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import {
  TooltipIconBar,
  TooltipIconBarItem,
} from "@/modules/ui/tooltip-icon-bar";
import { TouchButton } from "@/modules/ui/touch-button";
import { ChatTooltip } from "./chat-tooltip";
import styles from "./conversation-list.module.scss";
import {
  type ChatConversation,
  type ChatUser,
  conversationAvatarUser,
  conversationDisplayName,
  messagePreview,
} from "./types";

const CONVERSATION_SKELETONS = [
  { id: "cs-0", name: "58%", preview: "72%" },
  { id: "cs-1", name: "42%", preview: "55%" },
  { id: "cs-2", name: "68%", preview: "80%" },
  { id: "cs-3", name: "36%", preview: "48%" },
  { id: "cs-4", name: "52%", preview: "64%" },
  { id: "cs-5", name: "44%", preview: "70%" },
] as const;

function ConversationSkeletonList({
  count = CONVERSATION_SKELETONS.length,
  avatarSize = "2rem",
  label = "Loading conversations",
}: {
  count?: number;
  avatarSize?: string;
  label?: string;
}) {
  return (
    <div className={styles.listLoading} role="status" aria-label={label}>
      {CONVERSATION_SKELETONS.slice(0, count).map((row) => (
        <div key={row.id} className={styles.skeletonItem}>
          <SkeletonBlock
            className={styles.skeletonFill}
            height={avatarSize}
            width={avatarSize}
            radius="999px"
          />
          <span className={styles.skeletonBody}>
            <span className={styles.skeletonTop}>
              <SkeletonBlock
                className={styles.skeletonFill}
                height="0.875rem"
                width={row.name}
                radius="999px"
              />
              <SkeletonBlock
                className={styles.skeletonFill}
                height="0.7rem"
                width="1.75rem"
                radius="999px"
              />
            </span>
            <SkeletonBlock
              className={styles.skeletonFill}
              height="0.75rem"
              width={row.preview}
              radius="999px"
            />
          </span>
        </div>
      ))}
    </div>
  );
}

type ConversationListProps = {
  activeId?: string | undefined;
  onSelect: (conversationId: string) => void;
};

type View = "list" | "new-dm" | "new-group";
type ConversationFilter = "all" | "unread" | "group";

const FILTERS: { id: ConversationFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "group", label: "Group" },
];

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  STAFF: "Staff",
  TRAINER: "Trainer",
  STUDENT: "Student",
  PARENT: "Parent",
};

function contactRoleLabel(role: string) {
  return ROLE_LABELS[role] ?? role;
}

function contactsEmptyCopy(role: UserRole | undefined) {
  if (role === "OWNER" || role === "STAFF") {
    return {
      title: "No students yet",
      description: "Studio students will appear here so you can message them.",
    };
  }
  if (role === "TRAINER") {
    return {
      title: "No students yet",
      description:
        "Students in your batches will appear here so you can message them.",
    };
  }
  return {
    title: "No contacts yet",
    description:
      "Message friends once you follow each other, or chat with your studio staff and trainers.",
  };
}

function conversationsEmptyCopy(role: UserRole | undefined) {
  if (role && STAFF_ROLES.includes(role)) {
    return {
      title: "Start a conversation",
      description: "Reach out to a student — your chats will show up here.",
    };
  }
  return {
    title: "No messages yet",
    description:
      "Say hi to a friend, trainer, or studio staff — or jump into a batch chat.",
  };
}

function ConversationsEmpty({
  role,
  onNewMessage,
}: {
  role: UserRole | undefined;
  onNewMessage: () => void;
}) {
  const copy = conversationsEmptyCopy(role);
  return (
    <div className={styles.empty}>
      <div className={styles.emptyArt} aria-hidden>
        <span className={styles.emptyOrb} />
        <span className={styles.emptyOrbSecondary} />
        <Icon name="message-square" className={styles.emptyIcon} />
      </div>
      <h2 className={styles.emptyTitle}>{copy.title}</h2>
      <p className={styles.emptyDescription}>{copy.description}</p>
      <div className={styles.emptyActions}>
        <TouchButton variant="primary" fullWidth onClick={onNewMessage}>
          New message
        </TouchButton>
      </div>
    </div>
  );
}

function FilteredEmpty({ message }: { message: string }) {
  return (
    <div className={styles.emptyFiltered}>
      <div className={styles.emptyFilteredIcon} aria-hidden>
        <Icon name="search" />
      </div>
      <p className={styles.emptyFilteredText}>{message}</p>
    </div>
  );
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

function filterConversations(
  conversations: ChatConversation[],
  filter: ConversationFilter,
  query: string,
  currentUserId: string,
) {
  return conversations.filter((conversation) => {
    if (filter === "unread" && conversation.unreadCount <= 0) {
      return false;
    }
    if (filter === "group" && conversation.type !== "GROUP") {
      return false;
    }
    return matchesSearch(conversation, query, currentUserId);
  });
}

function timeAgo(value: string | null) {
  if (!value) {
    return "";
  }
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) {
    return "now";
  }
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }
  return `${Math.floor(hours / 24)}d`;
}

export function ConversationList({
  activeId,
  onSelect,
}: ConversationListProps) {
  const api = useApi();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const currentUserId = user?.id ?? "";

  const [view, setView] = useState<View>("list");
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [filter, setFilter] = useState<ConversationFilter>("all");
  const emptyContacts = contactsEmptyCopy(user?.role);

  const conversationsQuery = useQuery({
    queryKey: chatConversationsKey,
    queryFn: () => api.get<ChatConversation[]>("/chat/conversations"),
  });

  const conversations = conversationsQuery.data ?? [];
  const filterCounts = {
    unread: conversations.filter((c) => c.unreadCount > 0).length,
    group: conversations.filter((c) => c.type === "GROUP").length,
  };

  const trimmedSearch = search.trim().toLowerCase();

  const contactsQuery = useQuery({
    queryKey: ["chat-contacts"],
    queryFn: () => api.get<ChatUser[]>("/chat/contacts"),
    enabled: view !== "list" || trimmedSearch.length > 0,
  });

  const dmPartnerIds = new Set(
    conversations
      .filter((conversation) => conversation.type === "DM")
      .flatMap((conversation) =>
        conversation.members
          .filter((member) => member.user.id !== currentUserId)
          .map((member) => member.user.id),
      ),
  );

  const peopleResults = trimmedSearch
    ? (contactsQuery.data ?? []).filter(
        (contact) =>
          !dmPartnerIds.has(contact.id) &&
          (contact.name.toLowerCase().includes(trimmedSearch) ||
            contactRoleLabel(contact.role)
              .toLowerCase()
              .includes(trimmedSearch)),
      )
    : [];

  const createMutation = useMutation({
    mutationFn: (input: {
      type: "DM" | "GROUP";
      memberIds: string[];
      title?: string;
    }) => api.post<ChatConversation>("/chat/conversations", input),
    onSuccess: (conversation) => {
      void queryClient.invalidateQueries({ queryKey: chatConversationsKey });
      setView("list");
      setGroupName("");
      setGroupMembers([]);
      setContactSearch("");
      onSelect(conversation.id);
    },
  });

  if (view !== "list") {
    const isGroup = view === "new-group";
    return (
      <div className={styles.root}>
        <div className={styles.header}>
          <ChatTooltip label="Back">
            <Button
              variant="quiet"
              size="sm"
              isIconOnly
              aria-label="Back"
              onClick={() => {
                setContactSearch("");
                setView("list");
              }}
            >
              <Icon name="arrow-left" />
            </Button>
          </ChatTooltip>
          <span className={styles.headerTitle}>
            {isGroup ? "New group" : "New message"}
          </span>
        </div>

        {isGroup ? (
          <input
            className={styles.groupNameInput}
            placeholder="Group name"
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
          />
        ) : null}

        <div className={styles.contactSearch}>
          <SearchField
            aria-label="Search people"
            placeholder={
              user?.role && STAFF_ROLES.includes(user.role)
                ? "Search students"
                : "Search people"
            }
            value={contactSearch}
            onChange={setContactSearch}
          />
        </div>

        {contactsQuery.isLoading ? (
          <ConversationSkeletonList
            count={5}
            avatarSize="1.5rem"
            label="Loading people"
          />
        ) : (
          <ApiState
            isLoading={false}
            isError={contactsQuery.isError}
            error={contactsQuery.error}
            data={contactsQuery.data}
            emptyTitle={emptyContacts.title}
            emptyDescription={emptyContacts.description}
          >
            {(contacts) => {
              const query = contactSearch.trim().toLowerCase();
              const visible = query
                ? contacts.filter(
                    (contact) =>
                      contact.name.toLowerCase().includes(query) ||
                      contactRoleLabel(contact.role)
                        .toLowerCase()
                        .includes(query),
                  )
                : contacts;

              if (visible.length === 0) {
                return (
                  <div className={styles.empty}>
                    <Text slot="description">
                      {query
                        ? "No people match your search."
                        : emptyContacts.description}
                    </Text>
                  </div>
                );
              }

              return (
                <div className={styles.items}>
                  {visible.map((contact) => {
                    const selected = groupMembers.includes(contact.id);
                    return (
                      <button
                        key={contact.id}
                        type="button"
                        className={styles.item}
                        data-selected={(isGroup && selected) || undefined}
                        onClick={() => {
                          if (isGroup) {
                            setGroupMembers((current) =>
                              selected
                                ? current.filter((id) => id !== contact.id)
                                : [...current, contact.id],
                            );
                          } else {
                            createMutation.mutate({
                              type: "DM",
                              memberIds: [contact.id],
                            });
                          }
                        }}
                      >
                        <Avatar size="sm">
                          {contact.photoUrl ? (
                            <AvatarImage
                              src={contact.photoUrl}
                              alt={contact.name}
                            />
                          ) : null}
                          <AvatarFallback>
                            {contact.name.slice(0, 1)}
                          </AvatarFallback>
                        </Avatar>
                        <span className={styles.itemBody}>
                          <span className={styles.itemName}>
                            {contact.name}
                          </span>
                          <span className={styles.itemMeta}>
                            {contactRoleLabel(contact.role)}
                          </span>
                        </span>
                        {isGroup && selected ? <Icon name="check" /> : null}
                      </button>
                    );
                  })}
                </div>
              );
            }}
          </ApiState>
        )}

        {isGroup ? (
          <div className={styles.groupFooter}>
            <Button
              variant="primary"
              isDisabled={!groupName.trim() || groupMembers.length === 0}
              isPending={createMutation.isPending}
              onClick={() =>
                createMutation.mutate({
                  type: "GROUP",
                  memberIds: groupMembers,
                  title: groupName.trim(),
                })
              }
            >
              Create group ({groupMembers.length})
            </Button>
          </div>
        ) : null}

        {createMutation.isError ? (
          <Text className={styles.error}>
            {createMutation.error instanceof Error
              ? createMutation.error.message
              : "Could not start the conversation."}
          </Text>
        ) : null}
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>Messages</span>
        <TooltipIconBar
          placement="bottom"
          portal
          className={styles.headerActions ?? ""}
          disabled={isMobile}
        >
          <TooltipIconBarItem label="New message">
            <Button
              variant="quiet"
              size="sm"
              isIconOnly
              aria-label="New message"
              onClick={() => setView("new-dm")}
            >
              <Icon name="message-square" />
            </Button>
          </TooltipIconBarItem>
          <TooltipIconBarItem label="New group">
            <Button
              variant="quiet"
              size="sm"
              isIconOnly
              aria-label="New group"
              onClick={() => setView("new-group")}
            >
              <Icon name="users" />
            </Button>
          </TooltipIconBarItem>
        </TooltipIconBar>
      </div>

      <div className={styles.toolbar}>
        <SearchField
          aria-label="Search conversations"
          placeholder="Search"
          value={search}
          onChange={setSearch}
          {...(styles.search ? { className: styles.search } : {})}
        />
        <div className={styles.filters} role="tablist" aria-label="Filters">
          {FILTERS.map((item) => {
            const count =
              item.id === "unread"
                ? filterCounts.unread
                : item.id === "group"
                  ? filterCounts.group
                  : null;
            const selected = filter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                className={styles.filterBadge}
                data-selected={selected || undefined}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
                {count != null && count > 0 ? (
                  <span className={styles.filterCount}>{count}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {conversationsQuery.isLoading ? (
        <ConversationSkeletonList />
      ) : (
        <ApiState
          isLoading={false}
          isError={conversationsQuery.isError}
          error={conversationsQuery.error}
          data={conversationsQuery.data}
          emptyTitle={conversationsEmptyCopy(user?.role).title}
          emptyDescription={conversationsEmptyCopy(user?.role).description}
          allowEmpty
        >
          {(conversations) => {
            if (conversations.length === 0) {
              return (
                <ConversationsEmpty
                  role={user?.role}
                  onNewMessage={() => setView("new-dm")}
                />
              );
            }

            const visible = filterConversations(
              conversations,
              filter,
              search,
              currentUserId,
            );

            const peopleSection =
              peopleResults.length > 0 ? (
                <>
                  <p className={styles.sectionLabel}>People</p>
                  {peopleResults.map((contact) => (
                    <button
                      key={contact.id}
                      type="button"
                      className={styles.item}
                      disabled={createMutation.isPending}
                      onClick={() =>
                        createMutation.mutate({
                          type: "DM",
                          memberIds: [contact.id],
                        })
                      }
                    >
                      <Avatar size="md">
                        {contact.photoUrl ? (
                          <AvatarImage
                            src={contact.photoUrl}
                            alt={contact.name}
                          />
                        ) : null}
                        <AvatarFallback>
                          {contact.name.slice(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                      <span className={styles.itemBody}>
                        <span className={styles.itemName}>{contact.name}</span>
                        <span className={styles.itemMeta}>
                          {contactRoleLabel(contact.role)}
                        </span>
                      </span>
                    </button>
                  ))}
                </>
              ) : null;

            if (visible.length === 0) {
              if (peopleSection) {
                return <div className={styles.items}>{peopleSection}</div>;
              }
              return (
                <FilteredEmpty
                  message={
                    search.trim()
                      ? "No conversations or people match your search."
                      : filter === "unread"
                        ? "No unread conversations."
                        : "No group conversations."
                  }
                />
              );
            }

            return (
              <div className={styles.items}>
                {peopleSection ? (
                  <p className={styles.sectionLabel}>Conversations</p>
                ) : null}
                {visible.map((conversation) => {
                  const title = conversationDisplayName(
                    conversation,
                    currentUserId,
                  );
                  const avatarUser = conversationAvatarUser(
                    conversation,
                    currentUserId,
                  );
                  const avatarSrc =
                    avatarUser?.photoUrl ?? conversation.imageUrl ?? null;
                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      className={styles.item}
                      data-active={conversation.id === activeId || undefined}
                      onClick={() => onSelect(conversation.id)}
                    >
                      <Avatar size="md">
                        {avatarSrc ? (
                          <AvatarImage src={avatarSrc} alt={title} />
                        ) : null}
                        <AvatarFallback>
                          {conversation.type === "BATCH" ? (
                            <Icon name={ENTITY_ICONS.batch} />
                          ) : conversation.type === "GROUP" ? (
                            <Icon name="users" />
                          ) : (
                            title.slice(0, 1)
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <span className={styles.itemBody}>
                        <span className={styles.itemTop}>
                          <span className={styles.itemName}>{title}</span>
                          <span className={styles.itemTime}>
                            {timeAgo(conversation.lastMessageAt)}
                          </span>
                        </span>
                        <span className={styles.itemBottom}>
                          <span className={styles.itemPreview}>
                            {messagePreview(conversation.lastMessage)}
                          </span>
                          {conversation.unreadCount > 0 ? (
                            <span className={styles.unread}>
                              {conversation.unreadCount > 99
                                ? "99+"
                                : conversation.unreadCount}
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </button>
                  );
                })}
                {peopleSection}
              </div>
            );
          }}
        </ApiState>
      )}
    </div>
  );
}
