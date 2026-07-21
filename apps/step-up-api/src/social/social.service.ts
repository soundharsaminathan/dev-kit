import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  FollowRequestStatus,
  NotificationType,
  ProfileVisibility,
  UserRole,
} from "@prisma/client";
import { MediaService } from "../media/media.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  type DecryptedUser,
  type EncryptedUserFields,
  UserCryptoService,
  userPiiSelect,
} from "../users/user-crypto.service";
import {
  canViewContent,
  effectiveProfileVisibility,
  isAlwaysPublicRole,
} from "./visibility";

const FEED_PAGE_SIZE = 20;

const authorSelect = {
  id: true,
  ...userPiiSelect,
  photoUrl: true,
  role: true,
  profileVisibility: true,
} as const;

const publicUserSelect = {
  id: true,
  ...userPiiSelect,
  photoUrl: true,
  role: true,
} as const;

@Injectable()
export class SocialService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(UserCryptoService) private readonly crypto: UserCryptoService,
    @Inject(MediaService) private readonly media: MediaService,
    @Inject(NotificationsService)
    private readonly notifications: NotificationsService,
  ) {}

  private async hydrateAuthor<
    T extends EncryptedUserFields & { photoUrl?: string | null },
  >(author: T) {
    const decrypted = this.crypto.decryptUser(author);
    return {
      ...decrypted,
      photoUrl: await this.media.signReadUrl(author.photoUrl ?? null),
    };
  }

  private async hydratePost<
    T extends {
      author: EncryptedUserFields & { photoUrl?: string | null };
      imageUrls?: string[];
      repostOf?:
        | ({
            author: EncryptedUserFields & { photoUrl?: string | null };
            imageUrls?: string[];
          } & Record<string, unknown>)
        | null;
    },
  >(post: T) {
    const [author, imageUrls, repostOf] = await Promise.all([
      this.hydrateAuthor(post.author),
      post.imageUrls
        ? this.media.signReadUrls(post.imageUrls)
        : Promise.resolve(undefined),
      post.repostOf
        ? (async () => {
            const [repostAuthor, repostImages] = await Promise.all([
              this.hydrateAuthor(post.repostOf!.author),
              post.repostOf!.imageUrls
                ? this.media.signReadUrls(post.repostOf!.imageUrls)
                : Promise.resolve(undefined),
            ]);
            return {
              ...post.repostOf,
              author: repostAuthor,
              ...(repostImages ? { imageUrls: repostImages } : {}),
            };
          })()
        : Promise.resolve(post.repostOf),
    ]);

    return {
      ...post,
      author,
      ...(imageUrls ? { imageUrls } : {}),
      repostOf,
    };
  }

  async getProfile(viewerId: string, userId: string) {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        ...userPiiSelect,
        photoUrl: true,
        bannerUrl: true,
        coverUrl: true,
        styles: true,
        role: true,
        profileVisibility: true,
        studioId: true,
      },
    });

    if (!row) {
      throw new NotFoundException("User not found");
    }

    const user = this.crypto.decryptUser(row);

    const [followerCount, followingCount, follow, pendingRequest] =
      await Promise.all([
        this.prisma.follow.count({ where: { followingId: userId } }),
        this.prisma.follow.count({ where: { followerId: userId } }),
        this.prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: viewerId,
              followingId: userId,
            },
          },
        }),
        viewerId === userId
          ? Promise.resolve(null)
          : this.prisma.followRequest.findUnique({
              where: {
                requesterId_targetId: {
                  requesterId: viewerId,
                  targetId: userId,
                },
              },
            }),
      ]);

    const isFollowing = Boolean(follow);
    const viewable = await canViewContent({
      viewerId,
      author: user,
      isFollowing,
    });

    const visibility = effectiveProfileVisibility(user);
    const postCount = viewable
      ? await this.prisma.post.count({ where: { authorId: userId } })
      : 0;

    const posts = viewable
      ? (
          await this.listUserPosts(viewerId, userId, {
            skipVisibilityCheck: true,
          })
        ).map(serializePost)
      : [];

    return {
      id: user.id,
      name: user.name,
      bio: viewable || viewerId === userId ? user.bio : null,
      photoUrl: await this.media.signReadUrl(user.photoUrl),
      bannerUrl: await this.media.signReadUrl(user.bannerUrl),
      coverUrl: await this.media.signReadUrl(user.coverUrl),
      instagramUrl: viewable ? user.instagramUrl : null,
      styles: viewable ? user.styles : [],
      role: user.role,
      phone: viewable && user.role === UserRole.TRAINER ? user.phone : null,
      profileVisibility: visibility,
      studioId: user.studioId,
      canViewContent: viewable,
      isOwnProfile: viewerId === userId,
      isFollowing,
      followRequestStatus:
        pendingRequest?.status === FollowRequestStatus.PENDING
          ? FollowRequestStatus.PENDING
          : pendingRequest?.status === FollowRequestStatus.REJECTED
            ? FollowRequestStatus.REJECTED
            : null,
      followerCount,
      followingCount,
      postCount,
      posts,
    };
  }

  async follow(viewer: DecryptedUser, targetId: string) {
    if (viewer.id === targetId) {
      throw new BadRequestException("You cannot follow yourself");
    }

    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
    });
    if (!target) {
      throw new NotFoundException("User not found");
    }

    const existing = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: viewer.id,
          followingId: targetId,
        },
      },
    });
    if (existing) {
      return { status: "following" as const };
    }

    const visibility = effectiveProfileVisibility(target);
    if (visibility === ProfileVisibility.PUBLIC) {
      await this.prisma.$transaction([
        this.prisma.follow.create({
          data: { followerId: viewer.id, followingId: targetId },
        }),
        this.prisma.followRequest.deleteMany({
          where: { requesterId: viewer.id, targetId },
        }),
      ]);
      await this.notifyNewFollow(targetId, viewer);
      return { status: "following" as const };
    }

    const request = await this.prisma.followRequest.upsert({
      where: {
        requesterId_targetId: {
          requesterId: viewer.id,
          targetId,
        },
      },
      update: { status: FollowRequestStatus.PENDING },
      create: {
        requesterId: viewer.id,
        targetId,
        status: FollowRequestStatus.PENDING,
      },
    });

    return {
      status: "requested" as const,
      requestId: request.id,
    };
  }

  async unfollow(viewerId: string, targetId: string) {
    await this.prisma.$transaction([
      this.prisma.follow.deleteMany({
        where: { followerId: viewerId, followingId: targetId },
      }),
      this.prisma.followRequest.deleteMany({
        where: { requesterId: viewerId, targetId },
      }),
    ]);
    return { status: "unfollowed" as const };
  }

  private async notifyNewFollow(targetId: string, follower: DecryptedUser) {
    const followerName = follower.name?.trim() || "Someone";
    await this.notifications.create({
      userId: targetId,
      type: NotificationType.NEW_FOLLOW,
      title: "New follower",
      body: `${followerName} started following you.`,
      meta: { followerId: follower.id },
    });
  }

  async listFollowRequests(userId: string) {
    const requests = await this.prisma.followRequest.findMany({
      where: {
        targetId: userId,
        status: FollowRequestStatus.PENDING,
      },
      include: {
        requester: {
          select: publicUserSelect,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return Promise.all(
      requests.map(async (request) => ({
        ...request,
        requester: await this.hydrateAuthor(request.requester),
      })),
    );
  }

  async acceptFollowRequest(userId: string, requestId: string) {
    const request = await this.prisma.followRequest.findUnique({
      where: { id: requestId },
    });
    if (!request || request.targetId !== userId) {
      throw new NotFoundException("Follow request not found");
    }
    if (request.status !== FollowRequestStatus.PENDING) {
      throw new BadRequestException("Follow request is not pending");
    }

    await this.prisma.$transaction([
      this.prisma.follow.upsert({
        where: {
          followerId_followingId: {
            followerId: request.requesterId,
            followingId: request.targetId,
          },
        },
        update: {},
        create: {
          followerId: request.requesterId,
          followingId: request.targetId,
        },
      }),
      this.prisma.followRequest.update({
        where: { id: requestId },
        data: { status: FollowRequestStatus.ACCEPTED },
      }),
    ]);

    return { status: "following" as const };
  }

  async rejectFollowRequest(userId: string, requestId: string) {
    const request = await this.prisma.followRequest.findUnique({
      where: { id: requestId },
    });
    if (!request || request.targetId !== userId) {
      throw new NotFoundException("Follow request not found");
    }

    await this.prisma.followRequest.update({
      where: { id: requestId },
      data: { status: FollowRequestStatus.REJECTED },
    });

    return { status: "rejected" as const };
  }

  async createPost(
    authorId: string,
    data: { imageUrls: string[]; caption?: string },
  ) {
    if (!data.imageUrls?.length) {
      throw new BadRequestException("At least one image is required");
    }
    if (data.imageUrls.length > 10) {
      throw new BadRequestException("A post can have at most 10 images");
    }

    const post = await this.prisma.post.create({
      data: {
        authorId,
        imageUrls: data.imageUrls.map(
          (url) => this.media.resolveObjectKey(url) ?? url,
        ),
        caption: data.caption?.trim() || null,
      },
      include: this.postInclude(authorId),
    });
    return this.hydratePost(post);
  }

  async getFeed(viewerId: string, options: { cursor?: string } = {}) {
    const following = await this.prisma.follow.findMany({
      where: { followerId: viewerId },
      select: { followingId: true },
    });
    const authorIds = [viewerId, ...following.map((f) => f.followingId)];

    const posts = await this.prisma.post.findMany({
      where: { authorId: { in: authorIds } },
      include: this.postInclude(viewerId),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: FEED_PAGE_SIZE,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    });

    return {
      posts: await Promise.all(posts.map((post) => this.hydratePost(post))),
      nextCursor:
        posts.length === FEED_PAGE_SIZE
          ? (posts[posts.length - 1]?.id ?? null)
          : null,
    };
  }

  async listUserPosts(
    viewerId: string,
    userId: string,
    options?: { skipVisibilityCheck?: boolean },
  ) {
    if (!options?.skipVisibilityCheck) {
      const author = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          role: true,
          profileVisibility: true,
        },
      });
      if (!author) {
        throw new NotFoundException("User not found");
      }
      const follow = await this.prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: viewerId,
            followingId: userId,
          },
        },
      });
      const viewable = await canViewContent({
        viewerId,
        author,
        isFollowing: Boolean(follow),
      });
      if (!viewable) {
        throw new ForbiddenException("This account is private");
      }
    }

    const posts = await this.prisma.post.findMany({
      where: { authorId: userId },
      include: this.postInclude(viewerId),
      orderBy: { createdAt: "desc" },
      take: 60,
    });
    return Promise.all(posts.map((post) => this.hydratePost(post)));
  }

  async getPost(viewerId: string, postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: this.postInclude(viewerId),
    });
    if (!post) {
      throw new NotFoundException("Post not found");
    }

    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: viewerId,
          followingId: post.authorId,
        },
      },
    });
    const viewable = await canViewContent({
      viewerId,
      author: post.author,
      isFollowing: Boolean(follow),
    });
    if (!viewable) {
      throw new ForbiddenException("This account is private");
    }

    return this.hydratePost(post);
  }

  async likePost(viewerId: string, postId: string) {
    await this.assertCanInteract(viewerId, postId);
    try {
      await this.prisma.postLike.create({
        data: { postId, userId: viewerId },
      });
    } catch {
      throw new ConflictException("Already liked");
    }
    return this.getPost(viewerId, postId);
  }

  async unlikePost(viewerId: string, postId: string) {
    await this.assertCanInteract(viewerId, postId);
    await this.prisma.postLike.deleteMany({
      where: { postId, userId: viewerId },
    });
    return this.getPost(viewerId, postId);
  }

  async listComments(viewerId: string, postId: string) {
    await this.assertCanInteract(viewerId, postId);
    const comments = await this.prisma.postComment.findMany({
      where: { postId },
      include: {
        author: {
          select: publicUserSelect,
        },
      },
      orderBy: { createdAt: "asc" },
    });
    return Promise.all(
      comments.map(async (comment) => ({
        ...comment,
        author: await this.hydrateAuthor(comment.author),
      })),
    );
  }

  async addComment(viewerId: string, postId: string, body: string) {
    await this.assertCanInteract(viewerId, postId);
    const trimmed = body.trim();
    if (!trimmed) {
      throw new BadRequestException("Comment cannot be empty");
    }
    if (trimmed.length > 2000) {
      throw new BadRequestException("Comment is too long");
    }

    const comment = await this.prisma.postComment.create({
      data: { postId, authorId: viewerId, body: trimmed },
      include: {
        author: {
          select: publicUserSelect,
        },
      },
    });
    return {
      ...comment,
      author: await this.hydrateAuthor(comment.author),
    };
  }

  async repost(viewerId: string, postId: string) {
    const original = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        repostOf: true,
      },
    });
    if (!original) {
      throw new NotFoundException("Post not found");
    }
    await this.assertCanInteract(viewerId, postId);

    const source =
      original.repostOfId && original.repostOf ? original.repostOf : original;
    const imageUrls = source.imageUrls.map(
      (url) => this.media.resolveObjectKey(url) ?? url,
    );
    const rootId = original.repostOfId ?? original.id;

    const post = await this.prisma.post.create({
      data: {
        authorId: viewerId,
        imageUrls,
        caption: null,
        repostOfId: rootId,
      },
      include: this.postInclude(viewerId),
    });
    return this.hydratePost(post);
  }

  private async assertCanInteract(viewerId: string, postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { author: { select: authorSelect } },
    });
    if (!post) {
      throw new NotFoundException("Post not found");
    }
    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: viewerId,
          followingId: post.authorId,
        },
      },
    });
    const viewable = await canViewContent({
      viewerId,
      author: post.author,
      isFollowing: Boolean(follow),
    });
    if (!viewable) {
      throw new ForbiddenException("This account is private");
    }
  }

  private postInclude(viewerId: string) {
    return {
      author: { select: authorSelect },
      repostOf: {
        include: {
          author: { select: authorSelect },
        },
      },
      likes: {
        where: { userId: viewerId },
        select: { userId: true },
      },
      _count: {
        select: { likes: true, comments: true, reposts: true },
      },
    } as const;
  }

  async listStudioTrainers(viewerId: string, studioId: string) {
    const trainers = await this.prisma.user.findMany({
      where: { studioId, role: UserRole.TRAINER },
      select: {
        id: true,
        ...userPiiSelect,
        photoUrl: true,
        bannerUrl: true,
        styles: true,
        role: true,
      },
    });

    if (trainers.length === 0) {
      return [];
    }

    const trainerIds = trainers.map((trainer) => trainer.id);

    const [followerGroups, followingGroups, follows, pendingRequests] =
      await Promise.all([
        this.prisma.follow.groupBy({
          by: ["followingId"],
          where: { followingId: { in: trainerIds } },
          _count: { _all: true },
        }),
        this.prisma.follow.groupBy({
          by: ["followerId"],
          where: { followerId: { in: trainerIds } },
          _count: { _all: true },
        }),
        this.prisma.follow.findMany({
          where: {
            followerId: viewerId,
            followingId: { in: trainerIds },
          },
          select: { followingId: true },
        }),
        this.prisma.followRequest.findMany({
          where: {
            requesterId: viewerId,
            targetId: { in: trainerIds },
            status: FollowRequestStatus.PENDING,
          },
          select: { targetId: true },
        }),
      ]);

    const followerCountById = new Map(
      followerGroups.map((group) => [group.followingId, group._count._all]),
    );
    const followingCountById = new Map(
      followingGroups.map((group) => [group.followerId, group._count._all]),
    );
    const followingIds = new Set(follows.map((follow) => follow.followingId));
    const pendingIds = new Set(
      pendingRequests.map((request) => request.targetId),
    );

    const presented = await Promise.all(
      trainers.map(async (trainer) => {
        const user = this.crypto.decryptUser(trainer);
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          photoUrl: await this.media.signReadUrl(trainer.photoUrl),
          bannerUrl: await this.media.signReadUrl(trainer.bannerUrl),
          styles: trainer.styles,
          followerCount: followerCountById.get(trainer.id) ?? 0,
          followingCount: followingCountById.get(trainer.id) ?? 0,
          isOwnProfile: viewerId === trainer.id,
          isFollowing: followingIds.has(trainer.id),
          followRequestStatus: pendingIds.has(trainer.id)
            ? FollowRequestStatus.PENDING
            : null,
        };
      }),
    );

    return presented.sort((a, b) => a.name.localeCompare(b.name));
  }
}

export function serializePost<
  T extends {
    likes: Array<{ userId: string }>;
    _count: { likes: number; comments: number; reposts: number };
  },
>(post: T) {
  const { likes, ...rest } = post;
  return {
    ...rest,
    likedByMe: likes.length > 0,
  };
}

export { isAlwaysPublicRole };
