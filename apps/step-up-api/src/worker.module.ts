import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { InvoiceCreatedModule } from "./billing/invoice-created.module";
import { EventsModule } from "./events/events.module";
import { HealthModule } from "./health/health.module";
import { JobsCoreModule } from "./jobs/jobs.module";
import { MediaModule } from "./media/media.module";
import { PrismaModule } from "./prisma/prisma.module";
import { QueueModule } from "./queues/queue.module";
import { RedisModule } from "./redis/redis.module";
import { sentryNestImports, sentryNestProviders } from "./sentry-nest";
import { StudioFeaturesModule } from "./studio-features/studio-features.module";
import { UserCryptoModule } from "./users/user-crypto.module";

/**
 * Worker process: outbox poller, BullMQ processors, scheduled jobs.
 * Health-only HTTP. Domain controllers still get pulled in via memberships /
 * users / notifications, so AppModule globals (auth, media, features) must
 * be present or Nest dies before listen() and Cloud Run times out on PORT.
 */
@Module({
  imports: [
    ...sentryNestImports(),
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    UserCryptoModule,
    MediaModule,
    AuthModule,
    StudioFeaturesModule,
    QueueModule.forRoot({ role: "worker", requireRedis: true }),
    EventsModule.forRoot({ role: "worker" }),
    InvoiceCreatedModule,
    JobsCoreModule,
    HealthModule,
  ],
  providers: [...sentryNestProviders()],
})
export class WorkerModule {}
