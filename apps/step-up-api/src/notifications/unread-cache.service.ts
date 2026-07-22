import { Inject, Injectable } from "@nestjs/common";
import { NotificationStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";

function unreadKey(userId: string) {
  return `notif:unread:${userId}`;
}

@Injectable()
export class UnreadCacheService {
  constructor(
    @Inject(RedisService) private readonly redis: RedisService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async get(userId: string) {
    const cached = await this.redis.get(unreadKey(userId));
    if (cached !== null) {
      const parsed = Number(cached);
      if (Number.isFinite(parsed) && parsed >= 0) {
        return parsed;
      }
    }
    return this.refresh(userId);
  }

  async refresh(userId: string) {
    const count = await this.prisma.notification.count({
      where: {
        userId,
        status: NotificationStatus.ACTIVE,
        readAt: null,
        deletedAt: null,
      },
    });
    await this.redis.set(unreadKey(userId), String(count), 3600);
    return count;
  }

  async increment(userId: string) {
    const next = await this.redis.incr(unreadKey(userId));
    if (next === null) {
      return;
    }
    if (next < 0) {
      await this.refresh(userId);
    }
  }

  async decrement(userId: string) {
    const next = await this.redis.decr(unreadKey(userId));
    if (next === null) {
      return;
    }
    if (next < 0) {
      await this.redis.set(unreadKey(userId), "0", 3600);
    }
  }

  async invalidate(userId: string) {
    await this.redis.del(unreadKey(userId));
  }
}
