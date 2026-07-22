import { NotificationType, ProfileVisibility, UserRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SocialService } from "./social.service";

const FEED_PAGE_SIZE = 20;

function makePost(id: string, authorId = "viewer-1") {
  return {
    id,
    authorId,
    caption: null,
    imageUrls: [`posts/${id}.jpg`],
    repostOfId: null,
    createdAt: new Date(`2026-07-20T12:${id.padStart(2, "0")}:00.000Z`),
    author: {
      id: authorId,
      nameCiphertext: "n",
      nameIv: "iv",
      phoneCiphertext: null,
      phoneIv: null,
      photoUrl: null,
      role: "STUDENT",
      profileVisibility: "PUBLIC",
    },
    repostOf: null,
    likes: [],
    _count: { likes: 0, comments: 0, reposts: 0 },
  };
}

function makeViewer(overrides: Partial<{ id: string; name: string }> = {}) {
  return {
    id: overrides.id ?? "viewer-1",
    name: overrides.name ?? "Alex",
    phone: null,
    role: UserRole.STUDENT,
    profileVisibility: ProfileVisibility.PUBLIC,
  };
}

describe("SocialService.getFeed", () => {
  const prisma = {
    follow: { findMany: vi.fn() },
    post: { findMany: vi.fn() },
  };

  const crypto = {
    decryptUser: vi.fn((user: { id: string }) => ({
      ...user,
      name: "Viewer",
      phone: null,
    })),
  };

  const media = {
    signReadUrl: vi.fn(async (url: string | null) => url),
    signReadUrls: vi.fn(async (urls: string[]) => urls),
  };

  const notifications = {
    create: vi.fn(),
  };

  let service: SocialService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SocialService(
      prisma as never,
      crypto as never,
      media as never,
      notifications as never,
    );
    prisma.follow.findMany.mockResolvedValue([{ followingId: "trainer-1" }]);
  });

  it("returns the first page with a nextCursor when full", async () => {
    const page = Array.from({ length: FEED_PAGE_SIZE }, (_, i) =>
      makePost(String(i + 1).padStart(2, "0")),
    );
    prisma.post.findMany.mockResolvedValue(page);

    const result = await service.getFeed("viewer-1");

    expect(prisma.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { authorId: { in: ["viewer-1", "trainer-1"] } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: FEED_PAGE_SIZE,
      }),
    );
    expect(prisma.post.findMany.mock.calls[0]?.[0]).not.toHaveProperty(
      "cursor",
    );
    expect(result.posts).toHaveLength(FEED_PAGE_SIZE);
    expect(result.nextCursor).toBe(page[FEED_PAGE_SIZE - 1]?.id);
  });

  it("passes cursor/skip for subsequent pages and clears nextCursor", async () => {
    const page = [makePost("21"), makePost("22")];
    prisma.post.findMany.mockResolvedValue(page);

    const result = await service.getFeed("viewer-1", { cursor: "20" });

    expect(prisma.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: { id: "20" },
        skip: 1,
        take: FEED_PAGE_SIZE,
      }),
    );
    expect(result.posts).toHaveLength(2);
    expect(result.nextCursor).toBeNull();
  });
});

describe("SocialService.follow notifications", () => {
  const prisma = {
    user: { findUnique: vi.fn() },
    follow: {
      findUnique: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
      upsert: vi.fn(),
    },
    followRequest: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(async (ops: unknown[]) => Promise.all(ops)),
  };

  const crypto = {
    decryptUser: vi.fn((user: { id: string }) => ({
      ...user,
      name: "Viewer",
      phone: null,
    })),
  };

  const media = {
    signReadUrl: vi.fn(async (url: string | null) => url),
    signReadUrls: vi.fn(async (urls: string[]) => urls),
  };

  const notifications = {
    create: vi.fn(),
  };

  let service: SocialService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SocialService(
      prisma as never,
      crypto as never,
      media as never,
      notifications as never,
    );
    prisma.follow.create.mockResolvedValue({});
    prisma.follow.deleteMany.mockResolvedValue({ count: 1 });
    prisma.followRequest.deleteMany.mockResolvedValue({ count: 0 });
    prisma.followRequest.upsert.mockResolvedValue({
      id: "req-1",
      status: "PENDING",
    });
    prisma.followRequest.update.mockResolvedValue({});
    prisma.follow.upsert.mockResolvedValue({});
  });

  it("notifies once for a new public follow", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "trainer-1",
      role: UserRole.TRAINER,
      profileVisibility: ProfileVisibility.PUBLIC,
    });
    prisma.follow.findUnique.mockResolvedValue(null);

    const result = await service.follow(makeViewer() as never, "trainer-1");

    expect(result).toEqual({ status: "following" });
    expect(notifications.create).toHaveBeenCalledTimes(1);
    expect(notifications.create).toHaveBeenCalledWith({
      userId: "trainer-1",
      type: NotificationType.NEW_FOLLOW,
      followerName: "Alex",
      dedupeKey: "NEW_FOLLOW:trainer-1:viewer-1",
      meta: { followerId: "viewer-1" },
      actorId: "viewer-1",
      entityType: "user",
      entityId: "viewer-1",
    });
  });

  it("skips notification when already following", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "trainer-1",
      role: UserRole.TRAINER,
      profileVisibility: ProfileVisibility.PUBLIC,
    });
    prisma.follow.findUnique.mockResolvedValue({
      followerId: "viewer-1",
      followingId: "trainer-1",
    });

    const result = await service.follow(makeViewer() as never, "trainer-1");

    expect(result).toEqual({ status: "following" });
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it("skips notification for private follow requests", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "student-2",
      role: UserRole.STUDENT,
      profileVisibility: ProfileVisibility.PRIVATE,
    });
    prisma.follow.findUnique.mockResolvedValue(null);

    const result = await service.follow(makeViewer() as never, "student-2");

    expect(result).toEqual({ status: "requested", requestId: "req-1" });
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it("skips notification when accepting a follow request", async () => {
    prisma.followRequest.findUnique.mockResolvedValue({
      id: "req-1",
      requesterId: "viewer-1",
      targetId: "student-2",
      status: "PENDING",
    });

    const result = await service.acceptFollowRequest("student-2", "req-1");

    expect(result).toEqual({ status: "following" });
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it("skips notification on unfollow", async () => {
    const result = await service.unfollow("viewer-1", "trainer-1");

    expect(result).toEqual({ status: "unfollowed" });
    expect(notifications.create).not.toHaveBeenCalled();
  });
});
