import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { InvoiceCreatedModule } from "./billing/invoice-created.module";
import { EventsModule } from "./events/events.module";
import { HealthModule } from "./health/health.module";
import { JobsCoreModule } from "./jobs/jobs.module";
import { PrismaModule } from "./prisma/prisma.module";
import { QueueModule } from "./queues/queue.module";
import { RedisModule } from "./redis/redis.module";
import { sentryNestImports, sentryNestProviders } from "./sentry-nest";
import { UserCryptoModule } from "./users/user-crypto.module";

/**
 * Worker process: outbox poller, BullMQ processors, scheduled jobs.
 * No domain HTTP controllers (health only).
 */
@Module({
  imports: [
    ...sentryNestImports(),
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    UserCryptoModule,
    QueueModule.forRoot({ role: "worker", requireRedis: true }),
    EventsModule.forRoot({ role: "worker" }),
    InvoiceCreatedModule,
    JobsCoreModule,
    HealthModule,
  ],
  providers: [...sentryNestProviders()],
})
export class WorkerModule {}
