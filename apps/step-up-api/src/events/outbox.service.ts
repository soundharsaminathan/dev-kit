import { Inject, Injectable } from "@nestjs/common";
import type { OutboxEvent, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

type ClaimedOutboxRow = {
  id: string;
  type: string;
  payload: Prisma.JsonValue;
  createdAt: Date;
  publishedAt: Date | null;
  claimedAt: Date | null;
  attempts: number;
};

@Injectable()
export class OutboxService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  append(
    tx: Prisma.TransactionClient | PrismaService,
    type: string,
    payload: Prisma.InputJsonValue,
  ) {
    return tx.outboxEvent.create({
      data: {
        type,
        payload,
      },
    });
  }

  /** Non-transactional append (post-commit side-effect enqueue). */
  create(type: string, payload: Prisma.InputJsonValue) {
    return this.prisma.outboxEvent.create({
      data: { type, payload },
    });
  }

  /**
   * Atomically claims unpublished rows with SKIP LOCKED so multiple workers
   * can poll without double-processing. Stale claims older than 5 minutes
   * are reclaimable.
   */
  async claimUnpublished(limit = 50): Promise<OutboxEvent[]> {
    const rows = await this.prisma.$queryRaw<ClaimedOutboxRow[]>`
      UPDATE "OutboxEvent" AS o
      SET "claimedAt" = NOW()
      FROM (
        SELECT id
        FROM "OutboxEvent"
        WHERE "publishedAt" IS NULL
          AND (
            "claimedAt" IS NULL
            OR "claimedAt" < NOW() - INTERVAL '5 minutes'
          )
        ORDER BY "createdAt" ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      ) AS claim
      WHERE o.id = claim.id
      RETURNING
        o.id,
        o.type,
        o.payload,
        o."createdAt",
        o."publishedAt",
        o."claimedAt",
        o.attempts
    `;

    return rows as OutboxEvent[];
  }

  markPublished(id: string) {
    return this.prisma.outboxEvent.update({
      where: { id },
      data: { publishedAt: new Date(), claimedAt: new Date() },
    });
  }

  markPublishedMany(ids: string[]) {
    if (ids.length === 0) {
      return Promise.resolve({ count: 0 });
    }
    return this.prisma.outboxEvent.updateMany({
      where: { id: { in: ids } },
      data: { publishedAt: new Date(), claimedAt: new Date() },
    });
  }

  bumpAttempts(id: string) {
    return this.prisma.outboxEvent.update({
      where: { id },
      data: {
        attempts: { increment: 1 },
        claimedAt: null,
      },
    });
  }
}
