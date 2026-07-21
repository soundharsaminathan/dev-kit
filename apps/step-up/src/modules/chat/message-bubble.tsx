import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@dev-ui/components/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@dev-ui/components/avatar";
import { Button } from "@dev-ui/components/button";
import { Text } from "@dev-ui/components/text";
import { Icon } from "@dev-ui/icons";
import { useState } from "react";
import {
  TooltipIconBar,
  TooltipIconBarItem,
} from "@/modules/ui/tooltip-icon-bar";
import { EventCard } from "./event-card";
import { LocationCard } from "./location-card";
import styles from "./message-bubble.module.scss";
import { PollCard } from "./poll-card";
import type { ChatMessage, ChatRsvpStatus } from "./types";
import { VoiceNotePlayer } from "./voice-note-player";

export const REACTION_EMOJIS = ["👍", "❤️", "😂", "🎉", "😮", "😢"] as const;

const REACTION_LABELS: Record<(typeof REACTION_EMOJIS)[number], string> = {
  "👍": "Thumbs up",
  "❤️": "Heart",
  "😂": "Laugh",
  "🎉": "Celebrate",
  "😮": "Surprised",
  "😢": "Sad",
};

type MessageBubbleProps = {
  message: ChatMessage;
  currentUserId: string;
  showSender: boolean;
  canDelete: boolean;
  highlighted?: boolean | undefined;
  onToggleReaction: (emoji: string, active: boolean) => void;
  onReply?: ((message: ChatMessage) => void) | undefined;
  onJumpToReply?: ((messageId: string) => void) | undefined;
  onDelete: (message: ChatMessage) => void;
  onResend?: ((message: ChatMessage) => void) | undefined;
  resendPending?: boolean | undefined;
  onVote: (pollId: string, optionIds: string[]) => void;
  onRsvp: (eventId: string, status: ChatRsvpStatus) => void;
  votePending?: boolean | undefined;
  rsvpPending?: boolean | undefined;
};

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function MessageBubble({
  message,
  currentUserId,
  showSender,
  canDelete,
  highlighted,
  onToggleReaction,
  onReply,
  onJumpToReply,
  onDelete,
  onResend,
  resendPending,
  onVote,
  onRsvp,
  votePending,
  rsvpPending,
}: MessageBubbleProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const isMine = message.sender.id === currentUserId;
  const isPending =
    message.sendStatus === "sending" || message.sendStatus === "queued";
  const isQueued = message.sendStatus === "queued";
  const isFailed = message.sendStatus === "failed";
  const isLocal = Boolean(message.sendStatus);
  const hasAudio = Boolean(message.audioUrl) || message.type === "AUDIO";
  const isFlush =
    (message.imageUrls.length > 0 || Boolean(message.location)) &&
    !message.poll &&
    !message.event &&
    !hasAudio &&
    !message.replyTo;
  const isRich = Boolean(message.poll || message.event);

  if (message.deleted) {
    return (
      <div className={styles.row} data-mine={isMine || undefined}>
        <div className={styles.bubble} data-deleted="">
          <Text slot="description">Message deleted</Text>
        </div>
      </div>
    );
  }

  return (
    <div
      className={styles.row}
      data-mine={isMine || undefined}
      data-highlighted={highlighted || undefined}
    >
      {!isMine && showSender ? (
        <Avatar size="sm" className={styles.avatar}>
          {message.sender.photoUrl ? (
            <AvatarImage
              src={message.sender.photoUrl}
              alt={message.sender.name}
            />
          ) : null}
          <AvatarFallback>{message.sender.name.slice(0, 1)}</AvatarFallback>
        </Avatar>
      ) : null}

      <div className={styles.content}>
        {!isMine && showSender ? (
          <span className={styles.senderName}>{message.sender.name}</span>
        ) : null}

        <div className={styles.bubbleWrap}>
          <div
            className={styles.bubble}
            data-flush={isFlush || undefined}
            data-rich={isRich || undefined}
            data-pending={isPending || undefined}
            data-failed={isFailed || undefined}
          >
            {message.replyTo ? (
              <button
                type="button"
                className={styles.replyPreview}
                onClick={() => onJumpToReply?.(message.replyTo!.id)}
              >
                <span className={styles.replyName}>
                  {message.replyTo.senderName}
                </span>
                <span className={styles.replyText}>
                  {message.replyTo.deleted
                    ? "Message deleted"
                    : message.replyTo.type === "AUDIO"
                      ? "Voice message"
                      : (message.replyTo.text ?? "Attachment")}
                </span>
              </button>
            ) : null}

            {message.imageUrls.length > 0 ? (
              <div
                className={styles.images}
                data-multi={message.imageUrls.length > 1 || undefined}
              >
                {message.imageUrls.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt="" className={styles.image} />
                  </a>
                ))}
              </div>
            ) : null}

            {hasAudio ? (
              <VoiceNotePlayer
                src={message.audioUrl}
                duration={message.audioDuration}
              />
            ) : null}

            {message.poll ? (
              <PollCard
                poll={message.poll}
                currentUserId={currentUserId}
                votePending={votePending}
                onVote={(optionIds) => onVote(message.poll!.id, optionIds)}
              />
            ) : null}

            {message.event ? (
              <EventCard
                event={message.event}
                currentUserId={currentUserId}
                rsvpPending={rsvpPending}
                onRsvp={(status) => onRsvp(message.event!.id, status)}
              />
            ) : null}

            {message.location ? (
              <LocationCard location={message.location} />
            ) : null}

            {message.text ? (
              <p className={styles.text}>{message.text}</p>
            ) : null}

            <span className={styles.time}>
              {isQueued
                ? "Waiting for connection…"
                : isPending
                  ? "Sending…"
                  : formatTime(message.createdAt)}
            </span>
          </div>

          {!isLocal ? (
            <TooltipIconBar
              placement="top"
              portal
              className={styles.actions ?? ""}
            >
              <TooltipIconBarItem label="Add reaction">
                <button
                  type="button"
                  className={styles.actionButton}
                  aria-label="Add reaction"
                  onClick={() => setPickerOpen((open) => !open)}
                >
                  <Icon name="smile" />
                </button>
              </TooltipIconBarItem>
              {onReply ? (
                <TooltipIconBarItem label="Reply">
                  <button
                    type="button"
                    className={styles.actionButton}
                    aria-label="Reply"
                    onClick={() => onReply(message)}
                  >
                    <Icon name="message-square" />
                  </button>
                </TooltipIconBarItem>
              ) : null}
              {canDelete ? (
                <TooltipIconBarItem label="Delete message">
                  <button
                    type="button"
                    className={styles.actionButton}
                    aria-label="Delete message"
                    onClick={() => onDelete(message)}
                  >
                    <Icon name="trash" />
                  </button>
                </TooltipIconBarItem>
              ) : null}
            </TooltipIconBar>
          ) : canDelete || isFailed ? (
            <TooltipIconBar
              placement="top"
              portal
              className={`${styles.actions ?? ""} ${styles.actionsVisible ?? ""}`}
            >
              <TooltipIconBarItem label="Remove">
                <button
                  type="button"
                  className={styles.actionButton}
                  aria-label="Remove"
                  onClick={() => onDelete(message)}
                >
                  <Icon name="trash" />
                </button>
              </TooltipIconBarItem>
            </TooltipIconBar>
          ) : null}
        </div>

        {isFailed && onResend ? (
          <Alert variant="danger" className={styles.sendAlert}>
            <AlertTitle>Could not send</AlertTitle>
            <AlertDescription>
              Check your connection and try again.
            </AlertDescription>
            <AlertAction>
              <Button
                size="sm"
                variant="default"
                isPending={resendPending}
                onClick={() => onResend(message)}
              >
                Resend
              </Button>
            </AlertAction>
          </Alert>
        ) : null}

        {pickerOpen && !isLocal ? (
          <TooltipIconBar
            placement="top"
            portal
            className={styles.picker ?? ""}
          >
            {REACTION_EMOJIS.map((emoji) => (
              <TooltipIconBarItem key={emoji} label={REACTION_LABELS[emoji]}>
                <button
                  type="button"
                  className={styles.pickerEmoji}
                  aria-label={REACTION_LABELS[emoji]}
                  onClick={() => {
                    const active = message.reactions.some(
                      (reaction) =>
                        reaction.emoji === emoji &&
                        reaction.userIds.includes(currentUserId),
                    );
                    onToggleReaction(emoji, active);
                    setPickerOpen(false);
                  }}
                >
                  {emoji}
                </button>
              </TooltipIconBarItem>
            ))}
          </TooltipIconBar>
        ) : null}

        {message.reactions.length > 0 ? (
          <div className={styles.reactions}>
            {message.reactions.map((reaction) => {
              const mine = reaction.userIds.includes(currentUserId);
              return (
                <button
                  key={reaction.emoji}
                  type="button"
                  className={styles.reactionChip}
                  data-mine={mine || undefined}
                  onClick={() => onToggleReaction(reaction.emoji, mine)}
                >
                  <span>{reaction.emoji}</span>
                  <span className={styles.reactionCount}>{reaction.count}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
