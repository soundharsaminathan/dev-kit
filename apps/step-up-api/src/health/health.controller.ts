import { Controller, Get, Inject } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";

@Controller("health")
export class HealthController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RedisService) private readonly redis: RedisService,
  ) {}

  @Get()
  async check() {
    let database: "connected" | "disconnected" = "disconnected";
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = "connected";
    } catch {
      database = "disconnected";
    }

    const redis = this.redis.isEnabled()
      ? (await this.redis.ping())
        ? "connected"
        : "disconnected"
      : "disabled";

    const status =
      database === "connected"
        ? redis === "disconnected"
          ? "degraded"
          : "ok"
        : "degraded";

    return { status, database, redis };
  }
}
