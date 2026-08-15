import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  NotificationType,
  TrainerPayoutStatus,
  UserRole,
} from "@prisma/client";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  type DecryptedUser,
  type EncryptedUserFields,
  UserCryptoService,
} from "../users/user-crypto.service";

@Injectable()
export class PayoutsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(NotificationsService)
    private readonly notifications: NotificationsService,
    @Inject(UserCryptoService) private readonly crypto: UserCryptoService,
  ) {}

  async list(actor: DecryptedUser, studioId: string) {
    this.assertStudio(actor, studioId);
    const payouts = await this.prisma.trainerPayout.findMany({
      where: {
        studioId,
        ...(actor.role === UserRole.TRAINER ? { trainerId: actor.id } : {}),
      },
      orderBy: [{ periodStart: "desc" }, { createdAt: "desc" }],
      include: { trainer: true },
    });
    return payouts.map((payout) => this.present(payout));
  }

  async getById(actor: DecryptedUser, id: string) {
    const payout = await this.prisma.trainerPayout.findUnique({
      where: { id },
      include: {
        trainer: true,
        sessions: {
          orderBy: { session: { startsAt: "asc" } },
          include: {
            session: {
              select: {
                id: true,
                startsAt: true,
                endsAt: true,
                batch: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });
    if (!payout) {
      throw new NotFoundException("Payout not found");
    }
    this.assertCanView(actor, payout);
    return {
      ...this.present(payout),
      sessions: payout.sessions.map((link) => ({
        id: link.session.id,
        batchId: link.session.batch.id,
        batchName: link.session.batch.name,
        startsAt: link.session.startsAt.toISOString(),
        endsAt: link.session.endsAt.toISOString(),
      })),
    };
  }

  async updateDraft(
    actor: DecryptedUser,
    id: string,
    dto: { amount?: number; notes?: string },
  ) {
    const payout = await this.findForAdmin(actor, id);
    if (payout.status !== TrainerPayoutStatus.DRAFT) {
      throw new BadRequestException("Only draft payouts can be edited");
    }
    const updated = await this.prisma.trainerPayout.update({
      where: { id },
      data: {
        amount: dto.amount !== undefined ? dto.amount : payout.amount,
        notes: dto.notes !== undefined ? dto.notes : payout.notes,
      },
    });
    return { ...updated, amount: Number(updated.amount) };
  }

  async send(actor: DecryptedUser, id: string) {
    const payout = await this.findForAdmin(actor, id);
    if (payout.status !== TrainerPayoutStatus.DRAFT) {
      throw new BadRequestException("Only draft payouts can be sent");
    }
    const updated = await this.prisma.trainerPayout.update({
      where: { id },
      data: { status: TrainerPayoutStatus.SENT, sentAt: new Date() },
    });
    await this.notifications.create({
      userId: payout.trainerId,
      type: NotificationType.TRAINER_PAYOUT,
      dedupeKey: `TRAINER_PAYOUT:${payout.id}`,
      meta: { payoutId: payout.id },
      entityType: "trainerPayout",
      entityId: payout.id,
    });
    return { ...updated, amount: Number(updated.amount) };
  }

  async markPaid(actor: DecryptedUser, id: string) {
    const payout = await this.findForAdmin(actor, id);
    if (payout.status !== TrainerPayoutStatus.SENT) {
      throw new BadRequestException("Only sent payouts can be marked paid");
    }
    const updated = await this.prisma.trainerPayout.update({
      where: { id },
      data: { status: TrainerPayoutStatus.PAID, paidAt: new Date() },
    });
    return { ...updated, amount: Number(updated.amount) };
  }

  private async findForAdmin(actor: DecryptedUser, id: string) {
    const payout = await this.prisma.trainerPayout.findUnique({
      where: { id },
    });
    if (!payout) {
      throw new NotFoundException("Payout not found");
    }
    this.assertStudio(actor, payout.studioId);
    if (actor.role === UserRole.TRAINER) {
      throw new ForbiddenException("Only owner or staff can manage payouts");
    }
    return payout;
  }

  private assertStudio(actor: DecryptedUser, studioId: string) {
    if (actor.studioId !== studioId) {
      throw new ForbiddenException("You can only access your own studio");
    }
  }

  private assertCanView(actor: DecryptedUser, payout: { studioId: string }) {
    this.assertStudio(actor, payout.studioId);
    if (
      actor.role === UserRole.TRAINER &&
      "trainerId" in payout &&
      payout.trainerId !== actor.id
    ) {
      throw new ForbiddenException("You can only view your own payouts");
    }
  }

  private present(payout: {
    id: string;
    studioId: string;
    trainerId: string;
    periodStart: Date;
    periodEnd: Date;
    sessionCount: number;
    amount: { toNumber: () => number } | number | null;
    notes: string | null;
    status: TrainerPayoutStatus;
    sentAt: Date | null;
    paidAt: Date | null;
    createdAt: Date;
    trainer: EncryptedUserFields & { id: string };
  }) {
    return {
      id: payout.id,
      studioId: payout.studioId,
      trainerId: payout.trainerId,
      trainerName: this.crypto.decryptUser(payout.trainer).name,
      periodStart: payout.periodStart.toISOString(),
      periodEnd: payout.periodEnd.toISOString(),
      sessionCount: payout.sessionCount,
      amount: payout.amount === null ? null : Number(payout.amount),
      notes: payout.notes,
      status: payout.status,
      sentAt: payout.sentAt?.toISOString() ?? null,
      paidAt: payout.paidAt?.toISOString() ?? null,
      createdAt: payout.createdAt.toISOString(),
    };
  }
}
