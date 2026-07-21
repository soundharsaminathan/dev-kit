import { Inject, Injectable } from "@nestjs/common";
import { SessionStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SessionsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  listByBatch(batchId: string) {
    return this.prisma.session.findMany({
      where: { batchId },
      orderBy: { startsAt: "asc" },
    });
  }

  getById(id: string) {
    return this.prisma.session.findUniqueOrThrow({
      where: { id },
      include: { attendance: true, batch: true },
    });
  }

  create(data: { batchId: string; startsAt: string; endsAt: string }) {
    return this.prisma.session.create({
      data: {
        batchId: data.batchId,
        startsAt: new Date(data.startsAt),
        endsAt: new Date(data.endsAt),
        status: SessionStatus.SCHEDULED,
      },
    });
  }

  complete(id: string) {
    return this.prisma.session.update({
      where: { id },
      data: { status: SessionStatus.COMPLETED },
    });
  }
}
