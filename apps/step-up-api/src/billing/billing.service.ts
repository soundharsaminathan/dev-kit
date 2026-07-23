import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  InvoiceStatus,
  PaymentMethod,
  type User,
  UserRole,
} from "@prisma/client";
import { computePlatformFee } from "../memberships/membership-helpers";
import { PrismaService } from "../prisma/prisma.service";
import {
  type DecryptedUser,
  UserCryptoService,
} from "../users/user-crypto.service";

export type TrainerPaymentAnalytics = {
  trainerId: string;
  trainerName: string;
  studioId: string;
  from: string | null;
  to: string | null;
  studentCount: number;
  invoiceCount: number;
  totals: {
    collected: number;
    pending: number;
    overdue: number;
    platformFees: number;
    netCollected: number;
  };
  byStatus: Record<InvoiceStatus, { count: number; amount: number }>;
  byPaymentMethod: Record<PaymentMethod, { count: number; amount: number }>;
  byBatch: Array<{
    batchId: string;
    batchName: string;
    studentCount: number;
    invoiceCount: number;
    collected: number;
    pending: number;
    overdue: number;
  }>;
  invoices: Array<{
    id: string;
    studentId: string;
    studentName: string;
    amount: number;
    status: InvoiceStatus;
    paymentMethod: PaymentMethod | null;
    paidAt: string | null;
    platformFee: number;
    batchIds: string[];
  }>;
};

@Injectable()
export class BillingService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(UserCryptoService) private readonly crypto: UserCryptoService,
  ) {}

  async listByStudio(studioId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: { studioId },
      include: { student: true, membership: true },
      orderBy: { id: "desc" },
    });

    return invoices.map((invoice) => ({
      ...invoice,
      student: this.crypto.decryptUser(invoice.student),
    }));
  }

  listForStudent(studentId: string) {
    return this.prisma.invoice.findMany({
      where: { studentId },
      orderBy: { id: "desc" },
    });
  }

  async getTrainerAnalytics(
    actor: DecryptedUser,
    trainerId: string,
    studioId: string,
    options: { from?: string; to?: string } = {},
  ): Promise<TrainerPaymentAnalytics> {
    const resolvedTrainerId = this.resolveTrainerScope(actor, trainerId);

    if (actor.studioId !== studioId) {
      throw new ForbiddenException("Cannot view analytics for another studio");
    }

    const from = options.from ? new Date(options.from) : null;
    const to = options.to ? new Date(options.to) : null;

    if (from && Number.isNaN(from.getTime())) {
      throw new BadRequestException("Invalid from date");
    }
    if (to && Number.isNaN(to.getTime())) {
      throw new BadRequestException("Invalid to date");
    }

    const trainer = await this.prisma.user.findFirst({
      where: {
        id: resolvedTrainerId,
        studioId,
        role: UserRole.TRAINER,
      },
    });

    if (!trainer) {
      throw new NotFoundException("Trainer not found in this studio");
    }

    const batchLinks = await this.prisma.batchTrainer.findMany({
      where: {
        trainerId: resolvedTrainerId,
        batch: { studioId },
      },
      include: {
        batch: {
          include: {
            enrollments: true,
          },
        },
      },
    });

    const batches = batchLinks.map((link) => link.batch);
    const studentBatchMap = new Map<string, Set<string>>();

    for (const batch of batches) {
      for (const enrollment of batch.enrollments) {
        const batchIds = studentBatchMap.get(enrollment.studentId) ?? new Set();
        batchIds.add(batch.id);
        studentBatchMap.set(enrollment.studentId, batchIds);
      }
    }

    const studentIds = [...studentBatchMap.keys()];
    const emptyBatchRows = batches.map((batch) => ({
      batchId: batch.id,
      batchName: batch.name,
      studentCount: batch.enrollments.length,
      invoiceCount: 0,
      collected: 0,
      pending: 0,
      overdue: 0,
    }));

    if (studentIds.length === 0) {
      return {
        ...this.emptyAnalytics(trainer, studioId, from, to, 0),
        byBatch: emptyBatchRows,
      };
    }

    const invoices = await this.prisma.invoice.findMany({
      where: {
        studioId,
        studentId: { in: studentIds },
      },
      include: { student: true },
      orderBy: [{ paidAt: "desc" }, { id: "desc" }],
    });

    const filtered = invoices.filter((invoice) => {
      if (!from && !to) {
        return true;
      }
      if (invoice.status !== InvoiceStatus.PAID) {
        return true;
      }
      if (!invoice.paidAt) {
        return false;
      }
      if (from && invoice.paidAt < from) {
        return false;
      }
      if (to && invoice.paidAt > to) {
        return false;
      }
      return true;
    });

    const byStatus: TrainerPaymentAnalytics["byStatus"] = {
      [InvoiceStatus.PAID]: { count: 0, amount: 0 },
      [InvoiceStatus.PENDING]: { count: 0, amount: 0 },
      [InvoiceStatus.OVERDUE]: { count: 0, amount: 0 },
    };
    const byPaymentMethod: TrainerPaymentAnalytics["byPaymentMethod"] = {
      [PaymentMethod.CASH]: { count: 0, amount: 0 },
      [PaymentMethod.UPI_MANUAL]: { count: 0, amount: 0 },
    };
    const batchTotals = new Map<
      string,
      {
        batchId: string;
        batchName: string;
        studentIds: Set<string>;
        invoiceIds: Set<string>;
        collected: number;
        pending: number;
        overdue: number;
      }
    >();

    for (const batch of batches) {
      batchTotals.set(batch.id, {
        batchId: batch.id,
        batchName: batch.name,
        studentIds: new Set(
          batch.enrollments.map((enrollment) => enrollment.studentId),
        ),
        invoiceIds: new Set(),
        collected: 0,
        pending: 0,
        overdue: 0,
      });
    }

    let collected = 0;
    let pending = 0;
    let overdue = 0;
    let platformFees = 0;

    const invoiceRows: TrainerPaymentAnalytics["invoices"] = filtered.map(
      (invoice) => {
        const amount = Number(invoice.amount);
        const platformFee = computePlatformFee(
          amount,
          invoice.platformFeePercent,
        );
        const student = this.crypto.decryptUser(invoice.student);
        const batchIds = [...(studentBatchMap.get(invoice.studentId) ?? [])];

        byStatus[invoice.status].count += 1;
        byStatus[invoice.status].amount += amount;

        if (invoice.status === InvoiceStatus.PAID) {
          collected += amount;
          platformFees += platformFee;
          if (invoice.paymentMethod) {
            byPaymentMethod[invoice.paymentMethod].count += 1;
            byPaymentMethod[invoice.paymentMethod].amount += amount;
          }
        } else if (invoice.status === InvoiceStatus.PENDING) {
          pending += amount;
        } else {
          overdue += amount;
        }

        for (const batchId of batchIds) {
          const entry = batchTotals.get(batchId);
          if (!entry || entry.invoiceIds.has(invoice.id)) {
            continue;
          }
          entry.invoiceIds.add(invoice.id);
          if (invoice.status === InvoiceStatus.PAID) {
            entry.collected += amount;
          } else if (invoice.status === InvoiceStatus.PENDING) {
            entry.pending += amount;
          } else {
            entry.overdue += amount;
          }
        }

        return {
          id: invoice.id,
          studentId: invoice.studentId,
          studentName: student.name,
          amount,
          status: invoice.status,
          paymentMethod: invoice.paymentMethod,
          paidAt: invoice.paidAt?.toISOString() ?? null,
          platformFee,
          batchIds,
        };
      },
    );

    return {
      trainerId: trainer.id,
      trainerName: this.crypto.decryptUser(trainer).name,
      studioId,
      from: from?.toISOString() ?? null,
      to: to?.toISOString() ?? null,
      studentCount: studentIds.length,
      invoiceCount: filtered.length,
      totals: {
        collected: roundMoney(collected),
        pending: roundMoney(pending),
        overdue: roundMoney(overdue),
        platformFees: roundMoney(platformFees),
        netCollected: roundMoney(collected - platformFees),
      },
      byStatus: {
        PAID: {
          count: byStatus.PAID.count,
          amount: roundMoney(byStatus.PAID.amount),
        },
        PENDING: {
          count: byStatus.PENDING.count,
          amount: roundMoney(byStatus.PENDING.amount),
        },
        OVERDUE: {
          count: byStatus.OVERDUE.count,
          amount: roundMoney(byStatus.OVERDUE.amount),
        },
      },
      byPaymentMethod: {
        CASH: {
          count: byPaymentMethod.CASH.count,
          amount: roundMoney(byPaymentMethod.CASH.amount),
        },
        UPI_MANUAL: {
          count: byPaymentMethod.UPI_MANUAL.count,
          amount: roundMoney(byPaymentMethod.UPI_MANUAL.amount),
        },
      },
      byBatch: [...batchTotals.values()].map((batch) => ({
        batchId: batch.batchId,
        batchName: batch.batchName,
        studentCount: batch.studentIds.size,
        invoiceCount: batch.invoiceIds.size,
        collected: roundMoney(batch.collected),
        pending: roundMoney(batch.pending),
        overdue: roundMoney(batch.overdue),
      })),
      invoices: invoiceRows,
    };
  }

  async markPaid(id: string, paymentMethod: PaymentMethod) {
    const invoice = await this.prisma.invoice.findUniqueOrThrow({
      where: { id },
    });

    const amount = Number(invoice.amount);
    const platformFee = computePlatformFee(amount, invoice.platformFeePercent);

    return this.prisma.invoice
      .update({
        where: { id },
        data: {
          status: InvoiceStatus.PAID,
          paymentMethod,
          paidAt: new Date(),
        },
      })
      .then((result) => ({
        ...result,
        platformFeeComputed: platformFee,
      }));
  }

  createInvoice(data: {
    studentId: string;
    studioId: string;
    amount: number;
    membershipId?: string;
    platformFeePercent: number;
  }) {
    return this.prisma.invoice.create({
      data: {
        studentId: data.studentId,
        studioId: data.studioId,
        membershipId: data.membershipId,
        amount: data.amount,
        status: InvoiceStatus.PENDING,
        platformFeePercent: data.platformFeePercent,
      },
    });
  }

  private resolveTrainerScope(actor: DecryptedUser, trainerId: string): string {
    const isStaff =
      actor.role === UserRole.OWNER || actor.role === UserRole.STAFF;

    if (actor.role === UserRole.TRAINER) {
      if (trainerId !== actor.id) {
        throw new ForbiddenException(
          "Trainers can only view their own payment analytics",
        );
      }
      return actor.id;
    }

    if (!isStaff) {
      throw new ForbiddenException(
        "Only trainers and studio admins can view payment analytics",
      );
    }

    return trainerId;
  }

  private emptyAnalytics(
    trainer: User,
    studioId: string,
    from: Date | null,
    to: Date | null,
    studentCount: number,
  ): TrainerPaymentAnalytics {
    return {
      trainerId: trainer.id,
      trainerName: this.crypto.decryptUser(trainer).name,
      studioId,
      from: from?.toISOString() ?? null,
      to: to?.toISOString() ?? null,
      studentCount,
      invoiceCount: 0,
      totals: {
        collected: 0,
        pending: 0,
        overdue: 0,
        platformFees: 0,
        netCollected: 0,
      },
      byStatus: {
        PAID: { count: 0, amount: 0 },
        PENDING: { count: 0, amount: 0 },
        OVERDUE: { count: 0, amount: 0 },
      },
      byPaymentMethod: {
        CASH: { count: 0, amount: 0 },
        UPI_MANUAL: { count: 0, amount: 0 },
      },
      byBatch: [],
      invoices: [],
    };
  }
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
