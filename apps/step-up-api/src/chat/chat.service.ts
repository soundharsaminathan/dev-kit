import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  ConversationRole,
  ConversationType,
  type EventRsvpStatus,
  MessageType,
  Prisma,
  UserRole,
} from "@prisma/client";
import { MediaService } from "../media/media.service";
import { ChatNotificationBridgeService } from "../notifications/chat-notification-bridge.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  type DecryptedUser,
  type EncryptedUserFields,
  UserCryptoService,
  userPiiSelect,
} from "../users/user-crypto.service";
import { ChatGateway } from "./chat.gateway";
import { ChatCryptoService } from "./chat-crypto.service";

const MESSAGE_PAGE_SIZE = 50;

const userSelect = {
  id: true,
  ...userPiiSelect,
  photoUrl: true,
  role: true,
} as const;

const messageInclude = {
  sender: { select: userSelect },
  reactions: { select: { emoji: true, userId: true } },
  poll: {
    include: {
      options: {
        include: { votes: { select: { userId: true } } },
        orderBy: { order: "asc" as const },
      },
    },
  },
  event: {
    include: { rsvps: { select: { userId: true, status: true } } },
  },
  replyTo: {
    include: { sender: { select: userSelect } },
  },
} as const;

type MessageWithRelations = Prisma.MessageGetPayload<{
  include: typeof messageInclude;
}>;

const conversationInclude = {
  members: { include: { user: { select: userSelect } } },
  batch: { select: { id: true, name: true } },
} as const;

type ConversationWithMembers = Prisma.ConversationGetPayload<{
  include: typeof conversationInclude;
}>;

interface MessagePayload {
  text?: string | null;
  location?: {
    lat: number;
    lng: number;
    label?: string | null;
  } | null;
}

export interface CreateConversationInput {
  type: "DM" | "GROUP";
  memberIds: string[];
  title?: string;
}

export interface SendMessageInput {
  text?: string;
  imageUrls?: string[];
  audioUrl?: string;
  audioDuration?: number;
  location?: { lat: number; lng: number; label?: string };
  replyToId?: string;
  clientMessageId?: string;
}

export interface CreatePollInput {
  question: string;
  options: string[];
  multiSelect?: boolean;
  closesAt?: string;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  startsAt: string;
  endsAt?: string;
  locationLabel?: string;
  latitude?: number;
  longitude?: number;
}

function dmKeyFor(a: string, b: string) {
  return [a, b].sort().join(":");
}

function aggregateReactions(
  reactions: Array<{ emoji: string; userId: string }>,
) {
  const byEmoji = new Map<string, string[]>();
  for (const reaction of reactions) {
    const list = byEmoji.get(reaction.emoji) ?? [];
    list.push(reaction.userId);
    byEmoji.set(reaction.emoji, list);
  }
  return [...byEmoji.entries()].map(([emoji, userIds]) => ({
    emoji,
    count: userIds.length,
    userIds,
  }));
}

function serializePoll(poll: {
  id: string;
  question: string;
  multiSelect: boolean;
  closesAt: Date | null;
  options: Array<{
    id: string;
    label: string;
    votes: Array<{ userId: string }>;
  }>;
}) {
  const options = poll.options.map((option) => ({
    id: option.id,
    label: option.label,
    voterIds: option.votes.map((vote) => vote.userId),
    count: option.votes.length,
  }));
  const voterIds = new Set(options.flatMap((option) => option.voterIds));
  return {
    id: poll.id,
    question: poll.question,
    multiSelect: poll.multiSelect,
    closesAt: poll.closesAt?.toISOString() ?? null,
    options,
    totalVotes: voterIds.size,
  };
}

function serializeEvent(event: NonNullable<MessageWithRelations["event"]>) {
  const rsvps: Record<EventRsvpStatus, string[]> = {
    GOING: [],
    MAYBE: [],
    DECLINED: [],
  };
  for (const rsvp of event.rsvps) {
    rsvps[rsvp.status].push(rsvp.userId);
  }
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    locationLabel: event.locationLabel,
    latitude: event.latitude,
    longitude: event.longitude,
    rsvps,
  };
}

@Injectable()
export class ChatService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ChatCryptoService) private readonly crypto: ChatCryptoService,
    @Inject(UserCryptoService) private readonly userCrypto: UserCryptoService,
    @Inject(ChatGateway) private readonly gateway: ChatGateway,
    @Inject(MediaService) private readonly media: MediaService,
    @Inject(ChatNotificationBridgeService)
    private readonly chatNotifications: ChatNotificationBridgeService,
  ) {}

  private decryptPayload(
    wrappedKey: string,
    ciphertext: string | null,
    iv: string | null,
  ): MessagePayload {
    if (!ciphertext || !iv) {
      return {};
    }
    return this.crypto.decryptPayload<MessagePayload>(
      wrappedKey,
      ciphertext,
      iv,
    );
  }

  private async presentUser<
    T extends EncryptedUserFields & { photoUrl?: string | null },
  >(user: T) {
    const decrypted = this.userCrypto.decryptUser(user);
    return {
      ...decrypted,
      photoUrl: await this.media.signReadUrl(user.photoUrl ?? null),
    };
  }

  private async serializeMessage(
    message: MessageWithRelations,
    wrappedKey: string,
  ) {
    const deleted = Boolean(message.deletedAt);
    const payload = deleted
      ? {}
      : this.decryptPayload(wrappedKey, message.ciphertext, message.iv);

    let replyTo: {
      id: string;
      senderId: string;
      senderName: string;
      type: MessageType;
      text: string | null;
      deleted: boolean;
    } | null = null;
    if (message.replyTo) {
      const replyDeleted = Boolean(message.replyTo.deletedAt);
      const replyPayload = replyDeleted
        ? {}
        : this.decryptPayload(
            wrappedKey,
            message.replyTo.ciphertext,
            message.replyTo.iv,
          );
      replyTo = {
        id: message.replyTo.id,
        senderId: message.replyTo.sender.id,
        senderName: this.userCrypto.decryptUser(message.replyTo.sender).name,
        type: message.replyTo.type,
        text: replyPayload.text ?? null,
        deleted: replyDeleted,
      };
    }

    const [sender, imageUrls, audioUrl] = await Promise.all([
      this.presentUser(message.sender),
      deleted
        ? Promise.resolve([] as string[])
        : this.media.signReadUrls(message.imageUrls),
      deleted
        ? Promise.resolve(null)
        : this.media.signReadUrl(message.audioUrl),
    ]);

    return {
      id: message.id,
      conversationId: message.conversationId,
      type: message.type,
      sender,
      text: payload.text ?? null,
      location: payload.location ?? null,
      imageUrls,
      audioUrl,
      audioDuration: deleted ? null : (message.audioDuration ?? null),
      replyTo,
      reactions: aggregateReactions(message.reactions),
      poll: message.poll ? serializePoll(message.poll) : null,
      event: message.event ? serializeEvent(message.event) : null,
      deleted,
      createdAt: message.createdAt,
    };
  }

  private async serializeConversation(
    conversation: ConversationWithMembers,
    viewerId: string,
    extras?: {
      unreadCount?: number;
      lastMessage?: MessageWithRelations | null;
    },
  ) {
    const me = conversation.members.find(
      (member) => member.userId === viewerId,
    );
    const [imageUrl, members, lastMessage] = await Promise.all([
      this.media.signReadUrl(conversation.imageUrl),
      Promise.all(
        conversation.members.map(async (member) => ({
          user: await this.presentUser(member.user),
          role: member.role,
          lastReadAt: member.lastReadAt,
        })),
      ),
      extras?.lastMessage
        ? this.serializeMessage(extras.lastMessage, conversation.encryptedKey)
        : Promise.resolve(null),
    ]);

    return {
      id: conversation.id,
      type: conversation.type,
      title: conversation.title,
      imageUrl,
      batch: conversation.batch,
      members,
      myRole: me?.role ?? null,
      lastReadAt: me?.lastReadAt ?? null,
      lastMessageAt: conversation.lastMessageAt,
      unreadCount: extras?.unreadCount ?? 0,
      lastMessage,
      createdAt: conversation.createdAt,
    };
  }

  private async requireMembership(userId: string, conversationId: string) {
    const member = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
      include: { conversation: true },
    });
    if (!member) {
      throw new ForbiddenException("You are not a member of this conversation");
    }
    return member;
  }

  private async areMutualFriends(userId: string, otherId: string) {
    const follows = await this.prisma.follow.count({
      where: {
        OR: [
          { followerId: userId, followingId: otherId },
          { followerId: otherId, followingId: userId },
        ],
      },
    });
    return follows >= 2;
  }

  private isStudioStaff(role: UserRole) {
    return role === UserRole.OWNER || role === UserRole.STAFF;
  }

  private async shareTrainerBatch(trainerId: string, studentId: string) {
    const shared = await this.prisma.batchTrainer.findFirst({
      where: {
        trainerId,
        batch: { enrollments: { some: { studentId } } },
      },
      select: { batchId: true },
    });
    return Boolean(shared);
  }

  /** Staff↔studio students, trainers↔their students, otherwise mutual friends. */
  private async canDirectMessage(
    user: Pick<DecryptedUser, "id" | "role" | "studioId">,
    other: Pick<DecryptedUser, "id" | "role" | "studioId">,
  ) {
    if (await this.areMutualFriends(user.id, other.id)) {
      return true;
    }

    const sameStudio =
      Boolean(user.studioId) && user.studioId === other.studioId;

    if (
      sameStudio &&
      ((this.isStudioStaff(user.role) && other.role === UserRole.STUDENT) ||
        (user.role === UserRole.STUDENT && this.isStudioStaff(other.role)))
    ) {
      return true;
    }

    if (user.role === UserRole.TRAINER && other.role === UserRole.STUDENT) {
      return this.shareTrainerBatch(user.id, other.id);
    }
    if (user.role === UserRole.STUDENT && other.role === UserRole.TRAINER) {
      return this.shareTrainerBatch(other.id, user.id);
    }

    return false;
  }

  private async requireCanMessage(
    user: Pick<DecryptedUser, "id" | "role" | "studioId">,
    otherId: string,
  ) {
    const other = await this.prisma.user.findUnique({
      where: { id: otherId },
      select: { id: true, role: true, studioId: true },
    });
    if (!other) {
      throw new NotFoundException("User not found");
    }
    if (!(await this.canDirectMessage(user, other))) {
      throw new ForbiddenException(
        user.role === UserRole.STUDENT && other.role === UserRole.STUDENT
          ? "You can only message students who are your friends"
          : "You cannot message this person",
      );
    }
    return other;
  }

  async listConversations(userId: string) {
    const memberships = await this.prisma.conversationMember.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            ...conversationInclude,
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
              include: messageInclude,
            },
          },
        },
      },
    });

    const results = await Promise.all(
      memberships.map(async (membership) => {
        const conversation = membership.conversation;
        const unreadCount = await this.prisma.message.count({
          where: {
            conversationId: conversation.id,
            deletedAt: null,
            senderId: { not: userId },
            ...(membership.lastReadAt
              ? { createdAt: { gt: membership.lastReadAt } }
              : {}),
          },
        });
        return this.serializeConversation(conversation, userId, {
          unreadCount,
          lastMessage: conversation.messages[0] ?? null,
        });
      }),
    );

    return results.sort((a, b) => {
      const aTime = a.lastMessageAt ?? a.createdAt;
      const bTime = b.lastMessageAt ?? b.createdAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
  }

  async getConversation(userId: string, conversationId: string) {
    await this.requireMembership(userId, conversationId);
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: conversationInclude,
    });
    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }
    return this.serializeConversation(conversation, userId);
  }

  async createConversation(
    user: DecryptedUser,
    input: CreateConversationInput,
  ) {
    const memberIds = [...new Set(input.memberIds)].filter(
      (id) => id !== user.id,
    );

    if (input.type === "DM") {
      if (memberIds.length !== 1) {
        throw new BadRequestException("A DM needs exactly one other person");
      }
      const otherId = memberIds[0];
      await this.requireCanMessage(user, otherId);

      const dmKey = dmKeyFor(user.id, otherId);
      const existing = await this.prisma.conversation.findUnique({
        where: { dmKey },
        include: conversationInclude,
      });
      if (existing) {
        return this.serializeConversation(existing, user.id);
      }

      const conversation = await this.prisma.conversation.create({
        data: {
          type: ConversationType.DM,
          dmKey,
          encryptedKey: this.crypto.generateWrappedKey(),
          createdById: user.id,
          members: {
            create: [{ userId: user.id }, { userId: otherId }],
          },
        },
        include: conversationInclude,
      });
      this.notifyConversationChanged(conversation);
      return this.serializeConversation(conversation, user.id);
    }

    if (!input.title?.trim()) {
      throw new BadRequestException("Group chats need a name");
    }
    if (memberIds.length === 0) {
      throw new BadRequestException("Add at least one member to the group");
    }
    for (const memberId of memberIds) {
      await this.requireCanMessage(user, memberId);
    }

    const conversation = await this.prisma.conversation.create({
      data: {
        type: ConversationType.GROUP,
        title: input.title.trim(),
        encryptedKey: this.crypto.generateWrappedKey(),
        createdById: user.id,
        members: {
          create: [
            { userId: user.id, role: ConversationRole.ADMIN },
            ...memberIds.map((memberId) => ({ userId: memberId })),
          ],
        },
      },
      include: conversationInclude,
    });
    this.notifyConversationChanged(conversation);
    return this.serializeConversation(conversation, user.id);
  }

  async getBatchConversation(user: DecryptedUser, batchId: string) {
    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        trainers: { select: { trainerId: true } },
        enrollments: { select: { studentId: true } },
      },
    });
    if (!batch) {
      throw new NotFoundException("Batch not found");
    }

    const staffUsers = await this.prisma.user.findMany({
      where: {
        studioId: batch.studioId,
        role: { in: [UserRole.OWNER, UserRole.STAFF] },
      },
      select: { id: true },
    });

    const adminIds = new Set([
      ...staffUsers.map((staff) => staff.id),
      ...batch.trainers.map((trainer) => trainer.trainerId),
    ]);
    const memberIds = new Set([
      ...adminIds,
      ...batch.enrollments.map((enrollment) => enrollment.studentId),
    ]);

    if (!memberIds.has(user.id)) {
      throw new ForbiddenException("You are not part of this batch");
    }

    let conversation = await this.prisma.conversation.findUnique({
      where: { batchId },
      select: { id: true },
    });
    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          type: ConversationType.BATCH,
          title: batch.name,
          batchId,
          encryptedKey: this.crypto.generateWrappedKey(),
        },
        select: { id: true },
      });
    }

    await this.prisma.$transaction([
      this.prisma.conversationMember.deleteMany({
        where: {
          conversationId: conversation.id,
          userId: { notIn: [...memberIds] },
        },
      }),
      this.prisma.conversationMember.createMany({
        data: [...memberIds].map((memberId) => ({
          conversationId: conversation.id,
          userId: memberId,
          role: adminIds.has(memberId)
            ? ConversationRole.ADMIN
            : ConversationRole.MEMBER,
        })),
        skipDuplicates: true,
      }),
      this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { title: batch.name },
      }),
    ]);

    const full = await this.prisma.conversation.findUnique({
      where: { id: conversation.id },
      include: conversationInclude,
    });
    if (!full) {
      throw new NotFoundException("Conversation not found");
    }
    this.gateway.joinUsersToConversation([...memberIds], full.id);
    return this.serializeConversation(full, user.id);
  }

  async listMessages(
    userId: string,
    conversationId: string,
    options: { cursor?: string },
  ) {
    const member = await this.requireMembership(userId, conversationId);

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      include: messageInclude,
      orderBy: { createdAt: "desc" },
      take: MESSAGE_PAGE_SIZE,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    });

    const wrappedKey = member.conversation.encryptedKey;
    return {
      messages: await Promise.all(
        messages
          .reverse()
          .map((message) => this.serializeMessage(message, wrappedKey)),
      ),
      nextCursor:
        messages.length === MESSAGE_PAGE_SIZE ? messages[0]?.id : null,
    };
  }

  async sendMessage(
    user: DecryptedUser,
    conversationId: string,
    input: SendMessageInput,
  ) {
    const member = await this.requireMembership(user.id, conversationId);
    const conversation = member.conversation;
    const clientMessageId = input.clientMessageId?.trim() || null;

    if (clientMessageId) {
      const existing = await this.prisma.message.findUnique({
        where: {
          conversationId_senderId_clientMessageId: {
            conversationId,
            senderId: user.id,
            clientMessageId,
          },
        },
        include: messageInclude,
      });
      if (existing) {
        return this.serializeMessage(existing, conversation.encryptedKey);
      }
    }

    if (input.replyToId) {
      const target = await this.prisma.message.findUnique({
        where: { id: input.replyToId },
        select: { conversationId: true, deletedAt: true },
      });
      if (!target || target.conversationId !== conversationId) {
        throw new NotFoundException("Message to reply to not found");
      }
    }

    const text = input.text?.trim() || null;
    const imageUrls = (input.imageUrls ?? []).map(
      (url) => this.media.resolveObjectKey(url) ?? url,
    );
    const audioUrlRaw = input.audioUrl?.trim() || null;
    const audioUrl = audioUrlRaw
      ? (this.media.resolveObjectKey(audioUrlRaw) ?? audioUrlRaw)
      : null;
    const audioDuration = audioUrl
      ? Math.max(1, Math.round(input.audioDuration ?? 1))
      : null;
    const location = input.location ?? null;

    if (audioUrl && (imageUrls.length > 0 || location)) {
      throw new BadRequestException(
        "Voice notes cannot be combined with photos or location",
      );
    }

    let type: MessageType;
    if (location) {
      type = MessageType.LOCATION;
    } else if (audioUrl) {
      type = MessageType.AUDIO;
    } else if (imageUrls.length > 0) {
      type = MessageType.IMAGE;
    } else if (text) {
      type = MessageType.TEXT;
    } else {
      throw new BadRequestException("Message is empty");
    }

    const payload: MessagePayload = { text, location };
    const hasPayload = Boolean(text || location);
    const encrypted = hasPayload
      ? this.crypto.encryptPayload(conversation.encryptedKey, payload)
      : null;

    let message: MessageWithRelations;
    try {
      message = await this.prisma.message.create({
        data: {
          conversationId,
          senderId: user.id,
          clientMessageId,
          type,
          ciphertext: encrypted?.ciphertext ?? null,
          iv: encrypted?.iv ?? null,
          imageUrls,
          audioUrl,
          audioDuration,
          replyToId: input.replyToId ?? null,
        },
        include: messageInclude,
      });
    } catch (error) {
      if (
        clientMessageId &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const existing = await this.prisma.message.findUnique({
          where: {
            conversationId_senderId_clientMessageId: {
              conversationId,
              senderId: user.id,
              clientMessageId,
            },
          },
          include: messageInclude,
        });
        if (existing) {
          return this.serializeMessage(existing, conversation.encryptedKey);
        }
      }
      throw error;
    }

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: message.createdAt },
    });

    const serialized = await this.serializeMessage(
      message,
      conversation.encryptedKey,
    );
    this.gateway.emitToConversation(conversationId, "message.new", {
      conversationId,
      message: serialized,
    });

    const preview =
      serialized.text?.slice(0, 120) ||
      (serialized.imageUrls?.length ? "Sent a photo" : null) ||
      (serialized.audioUrl ? "Sent a voice message" : null) ||
      "New message";

    void this.chatNotifications
      .notifyNewMessage({
        conversationId,
        senderId: user.id,
        messageId: serialized.id,
        preview,
        conversationTitle: conversation.title,
      })
      .catch(() => undefined);

    return serialized;
  }

  async deleteMessage(user: DecryptedUser, messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, conversationId: true, senderId: true },
    });
    if (!message) {
      throw new NotFoundException("Message not found");
    }
    const member = await this.requireMembership(
      user.id,
      message.conversationId,
    );
    if (
      message.senderId !== user.id &&
      member.role !== ConversationRole.ADMIN
    ) {
      throw new ForbiddenException("You cannot delete this message");
    }

    await this.prisma.message.update({
      where: { id: messageId },
      data: {
        deletedAt: new Date(),
        ciphertext: null,
        iv: null,
        imageUrls: [],
        audioUrl: null,
        audioDuration: null,
      },
    });

    this.gateway.emitToConversation(message.conversationId, "message.deleted", {
      conversationId: message.conversationId,
      messageId,
    });
    return { status: "deleted" as const };
  }

  private async broadcastReactions(conversationId: string, messageId: string) {
    const reactions = await this.prisma.messageReaction.findMany({
      where: { messageId },
      select: { emoji: true, userId: true },
    });
    const aggregated = aggregateReactions(reactions);
    this.gateway.emitToConversation(conversationId, "reaction.updated", {
      conversationId,
      messageId,
      reactions: aggregated,
    });
    return aggregated;
  }

  async addReaction(user: DecryptedUser, messageId: string, emoji: string) {
    const trimmed = emoji.trim();
    if (!trimmed || trimmed.length > 16) {
      throw new BadRequestException("Invalid reaction");
    }
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { conversationId: true, deletedAt: true },
    });
    if (!message || message.deletedAt) {
      throw new NotFoundException("Message not found");
    }
    await this.requireMembership(user.id, message.conversationId);

    await this.prisma.messageReaction.upsert({
      where: {
        messageId_userId_emoji: { messageId, userId: user.id, emoji: trimmed },
      },
      update: {},
      create: { messageId, userId: user.id, emoji: trimmed },
    });

    return this.broadcastReactions(message.conversationId, messageId);
  }

  async removeReaction(user: DecryptedUser, messageId: string, emoji: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { conversationId: true },
    });
    if (!message) {
      throw new NotFoundException("Message not found");
    }
    await this.requireMembership(user.id, message.conversationId);

    await this.prisma.messageReaction.deleteMany({
      where: { messageId, userId: user.id, emoji },
    });

    return this.broadcastReactions(message.conversationId, messageId);
  }

  async createPoll(
    user: DecryptedUser,
    conversationId: string,
    input: CreatePollInput,
  ) {
    const member = await this.requireMembership(user.id, conversationId);

    const options = input.options.map((label) => label.trim()).filter(Boolean);
    if (options.length < 2 || options.length > 10) {
      throw new BadRequestException("Polls need between 2 and 10 options");
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: user.id,
        type: MessageType.POLL,
        poll: {
          create: {
            question: input.question.trim(),
            multiSelect: input.multiSelect ?? false,
            closesAt: input.closesAt ? new Date(input.closesAt) : null,
            options: {
              create: options.map((label, order) => ({ label, order })),
            },
          },
        },
      },
      include: messageInclude,
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: message.createdAt },
    });

    const serialized = await this.serializeMessage(
      message,
      member.conversation.encryptedKey,
    );
    this.gateway.emitToConversation(conversationId, "message.new", {
      conversationId,
      message: serialized,
    });
    return serialized;
  }

  async votePoll(user: DecryptedUser, pollId: string, optionIds: string[]) {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        options: { select: { id: true } },
        message: {
          select: { id: true, conversationId: true },
        },
      },
    });
    if (!poll) {
      throw new NotFoundException("Poll not found");
    }
    await this.requireMembership(user.id, poll.message.conversationId);

    if (poll.closesAt && poll.closesAt < new Date()) {
      throw new BadRequestException("This poll is closed");
    }

    const validIds = new Set(poll.options.map((option) => option.id));
    const selected = [...new Set(optionIds)].filter((id) => validIds.has(id));
    if (selected.length === 0) {
      throw new BadRequestException("Select at least one option");
    }
    if (!poll.multiSelect && selected.length > 1) {
      throw new BadRequestException("This poll allows only one choice");
    }

    const serialized = await this.prisma.$transaction(async (tx) => {
      await tx.pollVote.deleteMany({
        where: { userId: user.id, optionId: { in: [...validIds] } },
      });
      await tx.pollVote.createMany({
        data: selected.map((optionId) => ({ optionId, userId: user.id })),
      });
      const updated = await tx.poll.findUnique({
        where: { id: pollId },
        include: {
          options: {
            include: { votes: { select: { userId: true } } },
            orderBy: { order: "asc" },
          },
        },
      });
      if (!updated) {
        throw new NotFoundException("Poll not found");
      }
      return serializePoll(updated);
    });

    this.gateway.emitToConversation(
      poll.message.conversationId,
      "poll.updated",
      {
        conversationId: poll.message.conversationId,
        messageId: poll.message.id,
        poll: serialized,
      },
    );
    return serialized;
  }

  async createEvent(
    user: DecryptedUser,
    conversationId: string,
    input: CreateEventInput,
  ) {
    const member = await this.requireMembership(user.id, conversationId);

    const startsAt = new Date(input.startsAt);
    if (Number.isNaN(startsAt.getTime())) {
      throw new BadRequestException("Invalid event date");
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: user.id,
        type: MessageType.EVENT,
        event: {
          create: {
            title: input.title.trim(),
            description: input.description?.trim() || null,
            startsAt,
            endsAt: input.endsAt ? new Date(input.endsAt) : null,
            locationLabel: input.locationLabel?.trim() || null,
            latitude: input.latitude ?? null,
            longitude: input.longitude ?? null,
          },
        },
      },
      include: messageInclude,
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: message.createdAt },
    });

    const serialized = await this.serializeMessage(
      message,
      member.conversation.encryptedKey,
    );
    this.gateway.emitToConversation(conversationId, "message.new", {
      conversationId,
      message: serialized,
    });
    return serialized;
  }

  async rsvpEvent(
    user: DecryptedUser,
    eventId: string,
    status: EventRsvpStatus,
  ) {
    const event = await this.prisma.chatEvent.findUnique({
      where: { id: eventId },
      include: {
        message: {
          select: { id: true, conversationId: true },
        },
      },
    });
    if (!event) {
      throw new NotFoundException("Event not found");
    }
    await this.requireMembership(user.id, event.message.conversationId);

    await this.prisma.chatEventRsvp.upsert({
      where: { eventId_userId: { eventId, userId: user.id } },
      update: { status },
      create: { eventId, userId: user.id, status },
    });

    const updated = await this.prisma.chatEvent.findUnique({
      where: { id: eventId },
      include: { rsvps: { select: { userId: true, status: true } } },
    });
    if (!updated) {
      throw new NotFoundException("Event not found");
    }
    const serialized = serializeEvent(updated);
    this.gateway.emitToConversation(
      event.message.conversationId,
      "event.updated",
      {
        conversationId: event.message.conversationId,
        messageId: event.message.id,
        event: serialized,
      },
    );
    return serialized;
  }

  async markRead(userId: string, conversationId: string) {
    await this.requireMembership(userId, conversationId);
    await this.prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() },
    });
    return { status: "read" as const };
  }

  async addMembers(
    user: DecryptedUser,
    conversationId: string,
    memberIds: string[],
  ) {
    const member = await this.requireMembership(user.id, conversationId);
    if (member.conversation.type !== ConversationType.GROUP) {
      throw new BadRequestException("Members can only be added to groups");
    }
    if (member.role !== ConversationRole.ADMIN) {
      throw new ForbiddenException("Only group admins can add members");
    }

    const newIds = [...new Set(memberIds)].filter((id) => id !== user.id);
    for (const memberId of newIds) {
      await this.requireCanMessage(user, memberId);
    }

    await this.prisma.conversationMember.createMany({
      data: newIds.map((memberId) => ({
        conversationId,
        userId: memberId,
      })),
      skipDuplicates: true,
    });

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: conversationInclude,
    });
    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }
    this.gateway.joinUsersToConversation(newIds, conversationId);
    this.notifyConversationChanged(conversation);
    return this.serializeConversation(conversation, user.id);
  }

  async removeMember(
    user: DecryptedUser,
    conversationId: string,
    memberId: string,
  ) {
    const member = await this.requireMembership(user.id, conversationId);
    if (member.conversation.type !== ConversationType.GROUP) {
      throw new BadRequestException("Members can only be removed from groups");
    }
    if (memberId !== user.id && member.role !== ConversationRole.ADMIN) {
      throw new ForbiddenException("Only group admins can remove members");
    }

    await this.prisma.conversationMember.deleteMany({
      where: { conversationId, userId: memberId },
    });

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: conversationInclude,
    });
    if (conversation) {
      this.gateway.removeUserFromConversation(memberId, conversationId);
      this.notifyConversationChanged(conversation);
    }
    return { status: "removed" as const };
  }

  async updateGroup(
    user: DecryptedUser,
    conversationId: string,
    input: { title?: string; imageUrl?: string },
  ) {
    const member = await this.requireMembership(user.id, conversationId);
    if (member.conversation.type !== ConversationType.GROUP) {
      throw new BadRequestException("Only groups can be edited");
    }
    if (member.role !== ConversationRole.ADMIN) {
      throw new ForbiddenException("Only group admins can edit the group");
    }

    const conversation = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
      },
      include: conversationInclude,
    });
    this.notifyConversationChanged(conversation);
    return this.serializeConversation(conversation, user.id);
  }

  async listContacts(user: DecryptedUser) {
    const contactIds = new Set<string>();

    const [following, followers] = await Promise.all([
      this.prisma.follow.findMany({
        where: { followerId: user.id },
        select: { followingId: true },
      }),
      this.prisma.follow.findMany({
        where: { followingId: user.id },
        select: { followerId: true },
      }),
    ]);
    const followingIds = new Set(following.map((f) => f.followingId));
    for (const follower of followers) {
      if (followingIds.has(follower.followerId)) {
        contactIds.add(follower.followerId);
      }
    }

    if (this.isStudioStaff(user.role) && user.studioId) {
      const students = await this.prisma.user.findMany({
        where: {
          studioId: user.studioId,
          role: UserRole.STUDENT,
          id: { not: user.id },
        },
        select: { id: true },
      });
      for (const student of students) {
        contactIds.add(student.id);
      }
    }

    if (user.role === UserRole.TRAINER) {
      const trainerBatches = await this.prisma.batchTrainer.findMany({
        where: { trainerId: user.id },
        select: {
          batch: {
            select: {
              enrollments: { select: { studentId: true } },
            },
          },
        },
      });
      for (const row of trainerBatches) {
        for (const enrollment of row.batch.enrollments) {
          contactIds.add(enrollment.studentId);
        }
      }
    }

    if (user.role === UserRole.STUDENT && user.studioId) {
      const [staff, enrollments] = await Promise.all([
        this.prisma.user.findMany({
          where: {
            studioId: user.studioId,
            role: { in: [UserRole.OWNER, UserRole.STAFF] },
          },
          select: { id: true },
        }),
        this.prisma.batchEnrollment.findMany({
          where: { studentId: user.id },
          select: {
            batch: {
              select: {
                trainers: { select: { trainerId: true } },
              },
            },
          },
        }),
      ]);
      for (const staffUser of staff) {
        contactIds.add(staffUser.id);
      }
      for (const enrollment of enrollments) {
        for (const trainer of enrollment.batch.trainers) {
          contactIds.add(trainer.trainerId);
        }
      }
    }

    contactIds.delete(user.id);

    const users = await this.prisma.user.findMany({
      where: { id: { in: [...contactIds] } },
      select: userSelect,
    });
    const presented = await Promise.all(
      users.map((contact) => this.presentUser(contact)),
    );
    return presented.sort((a, b) => a.name.localeCompare(b.name));
  }

  private notifyConversationChanged(conversation: ConversationWithMembers) {
    const memberIds = conversation.members.map((member) => member.userId);
    this.gateway.joinUsersToConversation(memberIds, conversation.id);
    this.gateway.emitToUsers(memberIds, "conversation.updated", {
      conversationId: conversation.id,
    });
  }
}
