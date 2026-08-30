import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  NotificationType,
  Prisma,
  StudioInvoicePaymentMethod,
  StudioInvoiceStatus,
  StudioPlan,
  UserRole,
  type StudioInvoice,
} from "@prisma/client";
import { NotificationCommandsService } from "../notifications/notification-commands.service";
import { PrismaService } from "../prisma/prisma.service";
import type { DecryptedUser } from "../users/user-crypto.service";
import {
  getStudioUsage,
  listAmountForPlan,
  payableAmount,
  type StudioPlanKey,
  type StudioUsageCounts,
} from "./studio-usage";

export type CreateStudioInvoiceInput = {
  month?: string;
  plan?: StudioPlanKey;
  discount?: number;
  notes?: string | null;
};

export type UpdateStudioInvoiceInput = {
  month?: string;
  plan?: StudioPlanKey;
  discount?: number;
  notes?: string | null;
};

function toNumber(value: Prisma.Decimal | number): number {
  return typeof value === "number" ? value : Number(value);
}

function parsePlan(value: string | undefined): StudioPlanKey | undefined {
  if (value === undefined) return undefined;
  if (value === "BASIC" || value === "ADVANCED") return value;
  throw new BadRequestException("Plan must be BASIC or ADVANCED");
}

@Injectable()
export class StudioInvoicesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(NotificationCommandsService)
    private readonly notifications: NotificationCommandsService,
  ) {}

  async getUsage(actor: DecryptedUser, studioId: string, month?: string) {
    this.assertCanReadUsage(actor, studioId);
    await this.requireStudio(studioId);
    try {
      return await getStudioUsage(this.prisma, studioId, month);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : "Invalid month",
      );
    }
  }

  async list(actor: DecryptedUser, studioId: string) {
    this.assertCanList(actor, studioId);
    await this.requireStudio(studioId);

    const where: Prisma.StudioInvoiceWhereInput = {
      studioId,
      ...(actor.role === UserRole.SYSTEM_ADMIN
        ? {}
        : {
            status: {
              in: [StudioInvoiceStatus.PENDING, StudioInvoiceStatus.PAID],
            },
          }),
    };

    const rows = await this.prisma.studioInvoice.findMany({
      where,
      orderBy: [{ periodStart: "desc" }, { createdAt: "desc" }],
    });
    return rows.map((row) => this.present(row));
  }

  async create(
    actor: DecryptedUser,
    studioId: string,
    input: CreateStudioInvoiceInput,
  ) {
    this.assertSystemAdmin(actor);
    const studio = await this.requireStudio(studioId);
    const usage = await this.safeUsage(studioId, input.month);
    const plan = parsePlan(input.plan) ?? usage.suggestedPlan;
    const listAmount = listAmountForPlan(plan);
    const discount = this.normalizeDiscount(input.discount ?? 0, listAmount);
    const periodStart = new Date(usage.periodStart);
    const periodEnd = new Date(usage.periodEnd);

    const existingDraft = await this.prisma.studioInvoice.findFirst({
      where: {
        studioId,
        status: StudioInvoiceStatus.DRAFT,
        periodStart,
      },
    });
    if (existingDraft) {
      throw new ConflictException(
        "A draft invoice already exists for this studio and month",
      );
    }

    const row = await this.prisma.studioInvoice.create({
      data: {
        studioId,
        billedUserId: studio.ownerId,
        createdById: actor.id,
        status: StudioInvoiceStatus.DRAFT,
        plan: plan as StudioPlan,
        listAmount,
        discount,
        periodStart,
        periodEnd,
        usageSnapshot: this.snapshotFromUsage(usage),
        notes: input.notes?.trim() || null,
      },
    });
    return this.present(row);
  }

  async update(
    actor: DecryptedUser,
    id: string,
    input: UpdateStudioInvoiceInput,
  ) {
    this.assertSystemAdmin(actor);
    const existing = await this.requireInvoice(id);
    if (existing.status !== StudioInvoiceStatus.DRAFT) {
      throw new BadRequestException("Only draft invoices can be edited");
    }

    let periodStart = existing.periodStart;
    let periodEnd = existing.periodEnd;
    let usageSnapshot: Prisma.InputJsonValue =
      (existing.usageSnapshot as Prisma.InputJsonValue) ?? {};
    let plan =
      parsePlan(input.plan) ?? (existing.plan as StudioPlanKey);
    let listAmount = listAmountForPlan(plan);

    if (input.month !== undefined) {
      const usage = await this.safeUsage(existing.studioId, input.month);
      periodStart = new Date(usage.periodStart);
      periodEnd = new Date(usage.periodEnd);
      usageSnapshot = this.snapshotFromUsage(usage);
      if (input.plan === undefined) {
        plan = usage.suggestedPlan;
        listAmount = listAmountForPlan(plan);
      }

      const clash = await this.prisma.studioInvoice.findFirst({
        where: {
          studioId: existing.studioId,
          status: StudioInvoiceStatus.DRAFT,
          periodStart,
          id: { not: existing.id },
        },
      });
      if (clash) {
        throw new ConflictException(
          "A draft invoice already exists for this studio and month",
        );
      }
    } else if (input.plan !== undefined) {
      // Re-snapshot usage for the same month when plan changes so counts stay fresh.
      const monthKey = await this.monthKeyFromPeriod(
        existing.periodStart,
        existing.studioId,
      );
      const usage = await this.safeUsage(existing.studioId, monthKey);
      usageSnapshot = this.snapshotFromUsage(usage);
    }

    const discount = this.normalizeDiscount(
      input.discount !== undefined
        ? input.discount
        : toNumber(existing.discount),
      listAmount,
    );

    const row = await this.prisma.studioInvoice.update({
      where: { id: existing.id },
      data: {
        plan: plan as StudioPlan,
        listAmount,
        discount,
        periodStart,
        periodEnd,
        usageSnapshot,
        ...(input.notes !== undefined
          ? { notes: input.notes?.trim() || null }
          : {}),
      },
    });
    return this.present(row);
  }

  async publish(actor: DecryptedUser, id: string) {
    this.assertSystemAdmin(actor);
    const existing = await this.requireInvoice(id);
    if (existing.status !== StudioInvoiceStatus.DRAFT) {
      throw new BadRequestException("Only draft invoices can be published");
    }

    const row = await this.prisma.studioInvoice.update({
      where: { id: existing.id },
      data: {
        status: StudioInvoiceStatus.PENDING,
        publishedAt: new Date(),
      },
    });

    const amount = payableAmount(
      toNumber(row.listAmount),
      toNumber(row.discount),
    );
    await this.notifications.create({
      userId: row.billedUserId,
      studioId: row.studioId,
      type: NotificationType.STUDIO_PLAN_INVOICE,
      title: "classa plan invoice",
      body: `Your ${row.plan === "BASIC" ? "Basic" : "Advanced"} plan invoice for ₹${amount.toLocaleString("en-IN")} is ready.`,
      deepLink: "/app/settings/plan",
      entityType: "StudioInvoice",
      entityId: row.id,
      dedupeKey: `STUDIO_PLAN_INVOICE:${row.id}`,
      meta: { studioInvoiceId: row.id, plan: row.plan },
    });

    return this.present(row);
  }

  async markPaid(
    actor: DecryptedUser,
    id: string,
    paymentMethod: "CASH" | "UPI_MANUAL",
  ) {
    this.assertSystemAdmin(actor);
    const existing = await this.requireInvoice(id);
    if (existing.status !== StudioInvoiceStatus.PENDING) {
      throw new BadRequestException("Only pending invoices can be marked paid");
    }

    const method =
      paymentMethod === "UPI_MANUAL"
        ? StudioInvoicePaymentMethod.UPI_MANUAL
        : StudioInvoicePaymentMethod.CASH;

    const row = await this.prisma.studioInvoice.update({
      where: { id: existing.id },
      data: {
        status: StudioInvoiceStatus.PAID,
        paidAt: new Date(),
        paymentMethod: method,
      },
    });
    return this.present(row);
  }

  async void(actor: DecryptedUser, id: string) {
    this.assertSystemAdmin(actor);
    const existing = await this.requireInvoice(id);
    if (
      existing.status !== StudioInvoiceStatus.DRAFT &&
      existing.status !== StudioInvoiceStatus.PENDING
    ) {
      throw new BadRequestException(
        "Only draft or pending invoices can be voided",
      );
    }

    const row = await this.prisma.studioInvoice.update({
      where: { id: existing.id },
      data: { status: StudioInvoiceStatus.VOID },
    });
    return this.present(row);
  }

  private present(row: StudioInvoice) {
    const listAmount = toNumber(row.listAmount);
    const discount = toNumber(row.discount);
    const snapshot = row.usageSnapshot as StudioUsageCounts & {
      month?: string;
    };
    const month =
      typeof snapshot.month === "string" && /^\d{4}-\d{2}$/.test(snapshot.month)
        ? snapshot.month
        : this.monthKeyFromDate(row.periodStart);
    return {
      id: row.id,
      studioId: row.studioId,
      billedUserId: row.billedUserId,
      createdById: row.createdById,
      status: row.status,
      plan: row.plan,
      listAmount,
      discount,
      amountDue: payableAmount(listAmount, discount),
      month,
      periodStart: row.periodStart.toISOString(),
      periodEnd: row.periodEnd.toISOString(),
      usageSnapshot: {
        activeStudents: snapshot.activeStudents,
        trainers: snapshot.trainers,
        staff: snapshot.staff,
        batches: snapshot.batches,
        sessionsThisMonth: snapshot.sessionsThisMonth,
      },
      notes: row.notes,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      paidAt: row.paidAt?.toISOString() ?? null,
      paymentMethod: row.paymentMethod,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private snapshotFromUsage(usage: {
    month: string;
    activeStudents: number;
    trainers: number;
    staff: number;
    batches: number;
    sessionsThisMonth: number;
  }): Prisma.InputJsonValue {
    return {
      month: usage.month,
      activeStudents: usage.activeStudents,
      trainers: usage.trainers,
      staff: usage.staff,
      batches: usage.batches,
      sessionsThisMonth: usage.sessionsThisMonth,
    };
  }

  private normalizeDiscount(discount: number, listAmount: number): number {
    if (!Number.isFinite(discount) || discount < 0) {
      throw new BadRequestException("Discount must be zero or greater");
    }
    if (discount > listAmount) {
      throw new BadRequestException("Discount cannot exceed list amount");
    }
    return Math.round(discount * 100) / 100;
  }

  private async safeUsage(studioId: string, month?: string) {
    try {
      return await getStudioUsage(this.prisma, studioId, month);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : "Invalid month",
      );
    }
  }

  private async monthKeyFromPeriod(periodStart: Date, studioId: string) {
    const settings = await this.prisma.studioSettings.findUnique({
      where: { studioId },
      select: { timezone: true },
    });
    const timezone = settings?.timezone?.trim() || "Asia/Kolkata";
    return this.monthKeyFromDate(periodStart, timezone);
  }

  private monthKeyFromDate(date: Date, timeZone = "Asia/Kolkata") {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
    }).formatToParts(date);
    const year = parts.find((p) => p.type === "year")?.value ?? "1970";
    const month = parts.find((p) => p.type === "month")?.value ?? "01";
    return `${year}-${month}`;
  }

  private async requireStudio(studioId: string) {
    const studio = await this.prisma.studio.findUnique({
      where: { id: studioId },
      select: { id: true, ownerId: true, name: true },
    });
    if (!studio) {
      throw new NotFoundException("Studio not found");
    }
    return studio;
  }

  private async requireInvoice(id: string) {
    const row = await this.prisma.studioInvoice.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException("Studio invoice not found");
    }
    return row;
  }

  private assertSystemAdmin(actor: DecryptedUser) {
    if (actor.role !== UserRole.SYSTEM_ADMIN) {
      throw new ForbiddenException(
        "Only system admins can manage plan invoices",
      );
    }
  }

  private assertCanReadUsage(actor: DecryptedUser, studioId: string) {
    if (actor.role === UserRole.SYSTEM_ADMIN) return;
    if (actor.role === UserRole.OWNER && actor.studioId === studioId) return;
    throw new ForbiddenException("Not allowed to view studio usage");
  }

  private assertCanList(actor: DecryptedUser, studioId: string) {
    if (actor.role === UserRole.SYSTEM_ADMIN) return;
    if (actor.role === UserRole.OWNER && actor.studioId === studioId) return;
    throw new ForbiddenException("Not allowed to view plan invoices");
  }
}
