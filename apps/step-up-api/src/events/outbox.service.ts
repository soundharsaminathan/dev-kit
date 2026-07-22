import { Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class OutboxService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  append(
    tx: Prisma.TransactionClient,
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

  async claimUnpublished(limit = 50) {
    const events = await this.prisma.outboxEvent.findMany({
      where: { publishedAt: null },
      orderBy: { createdAt: "asc" },
      take: limit,
    });

    return events;
  }

  markPublished(id: string) {
    return this.prisma.outboxEvent.update({
      where: { id },
      data: { publishedAt: new Date() },
    });
  }

  bumpAttempts(id: string) {
    return this.prisma.outboxEvent.update({
      where: { id },
      data: { attempts: { increment: 1 } },
    });
  }
}
