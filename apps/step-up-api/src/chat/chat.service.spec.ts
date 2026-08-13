import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatService, formatMembersJoinedNotice } from "./chat.service";

const owner = {
  id: "owner-1",
  role: UserRole.OWNER,
  studioId: "studio-1",
} as never;

const student = {
  id: "student-1",
  role: UserRole.STUDENT,
  studioId: "studio-1",
} as never;

function conversationRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "conv-1",
    type: "DM",
    title: null,
    imageUrl: null,
    batchId: null,
    dmKey: null,
    encryptedKey: "wrapped",
    createdById: "student-1",
    lastMessageAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    batch: null,
    members: [
      {
        userId: "student-1",
        role: "MEMBER",
        lastReadAt: null,
        user: {
          id: "student-1",
          name: "Student",
          photoUrl: null,
          role: UserRole.STUDENT,
        },
      },
    ],
    ...overrides,
  };
}

describe("formatMembersJoinedNotice", () => {
  it("names one, two, and many joiners", () => {
    expect(formatMembersJoinedNotice(["Priya"])).toBe("Priya joined the group");
    expect(formatMembersJoinedNotice(["Priya", "Alex"])).toBe(
      "Priya and Alex joined the group",
    );
    expect(formatMembersJoinedNotice(["Priya", "Alex", "Sam"])).toBe(
      "Priya, Alex, and 1 other joined the group",
    );
    expect(formatMembersJoinedNotice(["Priya", "Alex", "Sam", "Lee"])).toBe(
      "Priya, Alex, and 2 others joined the group",
    );
  });
});

describe("ChatService", () => {
  const prisma = {
    follow: { count: vi.fn(), findMany: vi.fn() },
    user: { findUnique: vi.fn(), findMany: vi.fn() },
    batch: { findUnique: vi.fn() },
    batchTrainer: { findFirst: vi.fn(), findMany: vi.fn() },
    batchEnrollment: { findMany: vi.fn() },
    conversation: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    conversationMember: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
    },
    message: {
      findUnique: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };

  const crypto = {
    generateWrappedKey: vi.fn(() => "wrapped"),
    encryptPayload: vi.fn(() => ({ ciphertext: "ct", iv: "iv" })),
    decryptPayload: vi.fn(() => ({ text: "hi" })),
  };

  const userCrypto = {
    decryptUser: vi.fn(
      (user: {
        id: string;
        name?: string;
        photoUrl?: string | null;
        role?: UserRole;
      }) => ({
        id: user.id,
        name: user.name ?? "User",
        photoUrl: user.photoUrl ?? null,
        role: user.role ?? UserRole.STUDENT,
        email: `${user.id}@stepup.dev`,
        phone: null,
        bio: null,
        instagramUrl: null,
      }),
    ),
  };

  const gateway = {
    emitToConversation: vi.fn(),
    emitToUsers: vi.fn(),
    joinUsersToConversation: vi.fn(),
    removeUserFromConversation: vi.fn(),
  };

  const media = {
    resolveObjectKey: vi.fn((value: string) => {
      const trimmed = value.trim();
      if (/^(avatars|posts|chat|batches|uploads)\//.test(trimmed)) {
        return trimmed;
      }
      try {
        return new URL(trimmed).pathname.replace(/^\//, "") || null;
      } catch {
        return null;
      }
    }),
    signReadUrl: vi.fn(
      async (value: string | null | undefined) => value ?? null,
    ),
    signReadUrls: vi.fn(async (values: string[]) => values),
  };

  const chatNotifications = {
    notifyNewMessage: vi.fn().mockResolvedValue(undefined),
  };

  let service: ChatService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ChatService(
      prisma as never,
      crypto as never,
      userCrypto as never,
      gateway as never,
      media as never,
      chatNotifications as never,
    );
  });

  describe("createConversation (DM)", () => {
    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue({
        id: "friend-1",
        role: UserRole.STUDENT,
        studioId: "studio-1",
      });
      prisma.batchTrainer.findFirst.mockResolvedValue(null);
    });

    it("rejects a student DM when they are not friends", async () => {
      prisma.follow.count.mockResolvedValue(1);

      await expect(
        service.createConversation(student, {
          type: "DM",
          memberIds: ["friend-1"],
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.conversation.create).not.toHaveBeenCalled();
    });

    it("returns the existing DM instead of creating a duplicate", async () => {
      prisma.follow.count.mockResolvedValue(2);
      prisma.conversation.findUnique.mockResolvedValue(
        conversationRecord({ dmKey: "friend-1:student-1" }),
      );

      const result = await service.createConversation(student, {
        type: "DM",
        memberIds: ["friend-1"],
      });

      expect(result.id).toBe("conv-1");
      expect(prisma.conversation.create).not.toHaveBeenCalled();
    });

    it("creates a DM with a canonical dmKey when students are friends", async () => {
      prisma.follow.count.mockResolvedValue(2);
      prisma.conversation.findUnique.mockResolvedValue(null);
      prisma.conversation.create.mockResolvedValue(conversationRecord());

      await service.createConversation(student, {
        type: "DM",
        memberIds: ["friend-1"],
      });

      const data = prisma.conversation.create.mock.calls[0]?.[0]?.data;
      expect(data.dmKey).toBe("friend-1:student-1");
      expect(data.encryptedKey).toBe("wrapped");
      expect(gateway.emitToUsers).toHaveBeenCalled();
    });

    it("allows studio staff to DM a studio student without friendship", async () => {
      prisma.follow.count.mockResolvedValue(0);
      prisma.user.findUnique.mockResolvedValue({
        id: "student-1",
        role: UserRole.STUDENT,
        studioId: "studio-1",
      });
      prisma.conversation.findUnique.mockResolvedValue(null);
      prisma.conversation.create.mockResolvedValue(
        conversationRecord({
          members: [
            {
              userId: "owner-1",
              role: "MEMBER",
              lastReadAt: null,
              user: {
                id: "owner-1",
                name: "Owner",
                photoUrl: null,
                role: UserRole.OWNER,
              },
            },
            {
              userId: "student-1",
              role: "MEMBER",
              lastReadAt: null,
              user: {
                id: "student-1",
                name: "Student",
                photoUrl: null,
                role: UserRole.STUDENT,
              },
            },
          ],
        }),
      );

      await service.createConversation(owner, {
        type: "DM",
        memberIds: ["student-1"],
      });

      expect(prisma.conversation.create).toHaveBeenCalled();
      expect(prisma.follow.count).toHaveBeenCalled();
    });

    it("allows a trainer to DM a student in their batch", async () => {
      const trainer = {
        id: "trainer-1",
        role: UserRole.TRAINER,
        studioId: "studio-1",
      } as never;
      prisma.follow.count.mockResolvedValue(0);
      prisma.user.findUnique.mockResolvedValue({
        id: "student-1",
        role: UserRole.STUDENT,
        studioId: "studio-1",
      });
      prisma.batchTrainer.findFirst.mockResolvedValue({ batchId: "batch-1" });
      prisma.conversation.findUnique.mockResolvedValue(null);
      prisma.conversation.create.mockResolvedValue(conversationRecord());

      await service.createConversation(trainer, {
        type: "DM",
        memberIds: ["student-1"],
      });

      expect(prisma.batchTrainer.findFirst).toHaveBeenCalled();
      expect(prisma.conversation.create).toHaveBeenCalled();
    });

    it("rejects a trainer DM to a student outside their batches", async () => {
      const trainer = {
        id: "trainer-1",
        role: UserRole.TRAINER,
        studioId: "studio-1",
      } as never;
      prisma.follow.count.mockResolvedValue(0);
      prisma.user.findUnique.mockResolvedValue({
        id: "student-2",
        role: UserRole.STUDENT,
        studioId: "studio-1",
      });
      prisma.batchTrainer.findFirst.mockResolvedValue(null);

      await expect(
        service.createConversation(trainer, {
          type: "DM",
          memberIds: ["student-2"],
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.conversation.create).not.toHaveBeenCalled();
    });

    it("rejects a DM to more than one person", async () => {
      await expect(
        service.createConversation(student, {
          type: "DM",
          memberIds: ["friend-1", "friend-2"],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("listContacts", () => {
    it("includes studio students for owners even without friendship", async () => {
      prisma.follow.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      prisma.user.findMany
        .mockResolvedValueOnce([{ id: "student-1" }])
        .mockResolvedValueOnce([
          {
            id: "student-1",
            name: "Student",
            photoUrl: null,
            role: UserRole.STUDENT,
            encryptedKey: "k",
            piiCiphertext: "c",
            piiIv: "i",
          },
        ]);

      const contacts = await service.listContacts(owner);

      expect(contacts.map((c) => c.id)).toContain("student-1");
    });

    it("includes batch students for trainers", async () => {
      const trainer = {
        id: "trainer-1",
        role: UserRole.TRAINER,
        studioId: "studio-1",
      } as never;
      prisma.follow.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      prisma.batchTrainer.findMany.mockResolvedValue([
        { batch: { enrollments: [{ studentId: "student-1" }] } },
      ]);
      prisma.user.findMany.mockResolvedValue([
        {
          id: "student-1",
          name: "Student",
          photoUrl: null,
          role: UserRole.STUDENT,
          encryptedKey: "k",
          piiCiphertext: "c",
          piiIv: "i",
        },
      ]);

      const contacts = await service.listContacts(trainer);

      expect(contacts.map((c) => c.id)).toEqual(["student-1"]);
    });
  });

  describe("getBatchConversation", () => {
    beforeEach(() => {
      prisma.batch.findUnique.mockResolvedValue({
        id: "batch-1",
        name: "Kids Hip-hop",
        studioId: "studio-1",
        trainers: [{ trainerId: "trainer-1" }],
        enrollments: [{ studentId: "student-1" }],
      });
      prisma.user.findMany.mockResolvedValue([{ id: "owner-1" }]);
      prisma.message.count.mockResolvedValue(0);
    });

    it("forbids users outside the batch", async () => {
      const outsider = {
        id: "outsider-1",
        role: UserRole.STUDENT,
        studioId: "studio-1",
      } as never;

      await expect(
        service.getBatchConversation(outsider, "batch-1"),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("creates the batch conversation lazily and syncs members", async () => {
      prisma.conversation.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(
          conversationRecord({ id: "conv-batch", type: "BATCH" }),
        );
      prisma.conversation.create.mockResolvedValue({ id: "conv-batch" });
      prisma.conversationMember.deleteMany.mockResolvedValue({ count: 0 });
      prisma.conversationMember.createMany.mockResolvedValue({ count: 3 });
      prisma.conversation.update.mockResolvedValue({});

      await service.getBatchConversation(owner, "batch-1");

      expect(prisma.conversation.create).toHaveBeenCalled();
      const created = prisma.conversation.create.mock.calls[0]?.[0]?.data;
      expect(created.type).toBe("BATCH");
      expect(created.batchId).toBe("batch-1");

      const membersData =
        prisma.conversationMember.createMany.mock.calls[0]?.[0]?.data;
      const roleByUser = Object.fromEntries(
        membersData.map((m: { userId: string; role: string }) => [
          m.userId,
          m.role,
        ]),
      );
      expect(roleByUser["owner-1"]).toBe("ADMIN");
      expect(roleByUser["trainer-1"]).toBe("ADMIN");
      expect(roleByUser["student-1"]).toBe("MEMBER");

      const deleteArgs =
        prisma.conversationMember.deleteMany.mock.calls[0]?.[0];
      expect(deleteArgs.where.userId.notIn).toEqual(
        expect.arrayContaining(["owner-1", "trainer-1", "student-1"]),
      );
    });

    it("reuses the existing batch conversation", async () => {
      prisma.conversation.findUnique
        .mockResolvedValueOnce({ id: "conv-batch" })
        .mockResolvedValueOnce(
          conversationRecord({ id: "conv-batch", type: "BATCH" }),
        );
      prisma.conversationMember.deleteMany.mockResolvedValue({ count: 0 });
      prisma.conversationMember.createMany.mockResolvedValue({ count: 0 });
      prisma.conversation.update.mockResolvedValue({});

      await service.getBatchConversation(student, "batch-1");

      expect(prisma.conversation.create).not.toHaveBeenCalled();
    });
  });

  describe("sendMessage", () => {
    it("rejects senders who are not members", async () => {
      prisma.conversationMember.findUnique.mockResolvedValue(null);

      await expect(
        service.sendMessage(student, "conv-1", { text: "hello" }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("rejects empty messages", async () => {
      prisma.conversationMember.findUnique.mockResolvedValue({
        conversationId: "conv-1",
        userId: "student-1",
        role: "MEMBER",
        conversation: conversationRecord(),
      });

      await expect(
        service.sendMessage(student, "conv-1", {}),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects voice notes combined with photos", async () => {
      prisma.conversationMember.findUnique.mockResolvedValue({
        conversationId: "conv-1",
        userId: "student-1",
        role: "MEMBER",
        conversation: conversationRecord(),
      });

      await expect(
        service.sendMessage(student, "conv-1", {
          audioUrl: "https://media.example.com/chat/note.webm",
          imageUrls: ["https://media.example.com/chat/photo.jpg"],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("returns an existing message for the same clientMessageId without re-emitting", async () => {
      const existing = {
        id: "msg-1",
        conversationId: "conv-1",
        senderId: "student-1",
        clientMessageId: "client-1",
        type: "TEXT",
        ciphertext: "ct",
        iv: "iv",
        imageUrls: [],
        audioUrl: null,
        audioDuration: null,
        replyToId: null,
        deletedAt: null,
        createdAt: new Date("2026-07-20T10:00:00.000Z"),
        sender: {
          id: "student-1",
          name: "Student",
          photoUrl: null,
          role: UserRole.STUDENT,
        },
        replyTo: null,
        reactions: [],
        poll: null,
        event: null,
      };

      prisma.conversationMember.findUnique.mockResolvedValue({
        conversationId: "conv-1",
        userId: "student-1",
        role: "MEMBER",
        conversation: conversationRecord(),
      });
      prisma.message.findUnique.mockResolvedValue(existing);
      crypto.decryptPayload.mockReturnValue({ text: "hello again" });

      const result = await service.sendMessage(student, "conv-1", {
        text: "hello again",
        clientMessageId: "client-1",
      });

      expect(result.id).toBe("msg-1");
      expect(prisma.message.create).not.toHaveBeenCalled();
      expect(gateway.emitToConversation).not.toHaveBeenCalled();
      expect(chatNotifications.notifyNewMessage).not.toHaveBeenCalled();
    });

    it("stores clientMessageId on create and emits once", async () => {
      const created = {
        id: "msg-2",
        conversationId: "conv-1",
        senderId: "student-1",
        clientMessageId: "client-2",
        type: "TEXT",
        ciphertext: "ct",
        iv: "iv",
        imageUrls: [],
        audioUrl: null,
        audioDuration: null,
        replyToId: null,
        deletedAt: null,
        createdAt: new Date("2026-07-20T11:00:00.000Z"),
        sender: {
          id: "student-1",
          name: "Student",
          photoUrl: null,
          role: UserRole.STUDENT,
        },
        replyTo: null,
        reactions: [],
        poll: null,
        event: null,
      };

      prisma.conversationMember.findUnique.mockResolvedValue({
        conversationId: "conv-1",
        userId: "student-1",
        role: "MEMBER",
        conversation: conversationRecord(),
      });
      prisma.message.findUnique.mockResolvedValue(null);
      prisma.message.create.mockResolvedValue(created);
      prisma.conversation.update.mockResolvedValue({});
      crypto.decryptPayload.mockReturnValue({ text: "hello" });

      const result = await service.sendMessage(student, "conv-1", {
        text: "hello",
        clientMessageId: "client-2",
      });

      expect(prisma.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            clientMessageId: "client-2",
            type: "TEXT",
          }),
        }),
      );
      expect(result.id).toBe("msg-2");
      expect(gateway.emitToConversation).toHaveBeenCalledTimes(1);
      expect(gateway.emitToConversation).toHaveBeenCalledWith(
        "conv-1",
        "message.new",
        expect.objectContaining({ conversationId: "conv-1" }),
      );
      expect(chatNotifications.notifyNewMessage).toHaveBeenCalledTimes(1);
      expect(chatNotifications.notifyNewMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: "conv-1",
          senderId: "student-1",
          messageId: "msg-2",
        }),
      );
    });
  });

  describe("batch system notices", () => {
    function stubBatchConversation() {
      prisma.batch.findUnique.mockResolvedValue({
        id: "batch-1",
        name: "Kids Hip-hop",
        studioId: "studio-1",
        trainers: [{ trainerId: "trainer-1" }],
        enrollments: [{ studentId: "student-1" }],
      });
      prisma.conversation.findUnique.mockResolvedValue({
        id: "conv-batch",
        encryptedKey: "wrapped",
      });
      prisma.conversationMember.deleteMany.mockResolvedValue({ count: 0 });
      prisma.conversationMember.createMany.mockResolvedValue({ count: 0 });
      prisma.conversation.update.mockResolvedValue({});
    }

    it("posts an encrypted SYSTEM notice into the batch chat", async () => {
      stubBatchConversation();
      prisma.user.findMany.mockResolvedValue([{ id: "owner-1" }]);
      prisma.message.create.mockResolvedValue({
        id: "msg-sys-1",
        conversationId: "conv-batch",
        senderId: "owner-1",
        type: "SYSTEM",
        ciphertext: "ct",
        iv: "iv",
        imageUrls: [],
        audioUrl: null,
        audioDuration: null,
        replyToId: null,
        deletedAt: null,
        createdAt: new Date("2026-08-13T10:00:00.000Z"),
        sender: {
          id: "owner-1",
          name: "Owner",
          photoUrl: null,
          role: UserRole.OWNER,
        },
        replyTo: null,
        reactions: [],
        poll: null,
        event: null,
      });
      crypto.decryptPayload.mockReturnValue({
        text: "Priya joined the group",
      });

      const result = await service.postBatchSystemNotice(
        "owner-1",
        "batch-1",
        "Priya joined the group",
      );

      expect(prisma.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            conversationId: "conv-batch",
            senderId: "owner-1",
            type: "SYSTEM",
          }),
        }),
      );
      expect(result.type).toBe("SYSTEM");
      expect(result.text).toBe("Priya joined the group");
      expect(gateway.emitToConversation).toHaveBeenCalledWith(
        "conv-batch",
        "message.new",
        expect.objectContaining({ conversationId: "conv-batch" }),
      );
      expect(chatNotifications.notifyNewMessage).not.toHaveBeenCalled();
    });

    it("rejects an empty system notice", async () => {
      await expect(
        service.postBatchSystemNotice("owner-1", "batch-1", "   "),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.message.create).not.toHaveBeenCalled();
    });

    it("announces newly enrolled members by name", async () => {
      stubBatchConversation();
      prisma.user.findMany.mockImplementation(
        async (args: { where?: { id?: { in?: string[] }; role?: unknown } }) => {
          if (args.where?.id?.in) {
            return [
              {
                id: "student-1",
                name: "Priya",
                photoUrl: null,
                role: UserRole.STUDENT,
              },
              {
                id: "student-2",
                name: "Alex",
                photoUrl: null,
                role: UserRole.STUDENT,
              },
            ];
          }
          return [{ id: "owner-1" }];
        },
      );
      prisma.message.create.mockResolvedValue({
        id: "msg-sys-2",
        conversationId: "conv-batch",
        senderId: "owner-1",
        type: "SYSTEM",
        ciphertext: "ct",
        iv: "iv",
        imageUrls: [],
        audioUrl: null,
        audioDuration: null,
        replyToId: null,
        deletedAt: null,
        createdAt: new Date("2026-08-13T10:00:00.000Z"),
        sender: {
          id: "owner-1",
          name: "Owner",
          photoUrl: null,
          role: UserRole.OWNER,
        },
        replyTo: null,
        reactions: [],
        poll: null,
        event: null,
      });
      crypto.decryptPayload.mockReturnValue({
        text: "Priya and Alex joined the group",
      });

      await service.announceMembersJoined("owner-1", "batch-1", [
        "student-1",
        "student-2",
      ]);

      expect(crypto.encryptPayload).toHaveBeenCalledWith("wrapped", {
        text: "Priya and Alex joined the group",
      });
    });
  });
});
