import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  type AttendanceSource,
  type AttendanceStatus,
  type BatchCategory,
  BatchEnrollmentStatus,
  BillingCadence,
  IndividualAudience,
  InvoiceStatus,
  MembershipBillingPhase,
  MembershipStatus,
  type PaymentMethod,
  Prisma,
  type SessionStatus,
  type SessionType,
  SubscriptionKind,
  UserRole,
} from "@prisma/client";
import {
  utcOffsetMinutesForZone,
  zonedLocalToUtc,
} from "../common/zoned-local-time";
import {
  getPeriodEnd,
  seatRoleForBatchCategory,
  utcMonthStart,
} from "../memberships/membership-helpers";
import { PrismaService } from "../prisma/prisma.service";
import {
  currentMonthPeriod,
  ProjectionService,
} from "../queues/processors/projection.service";
import type { DecryptedUser } from "../users/user-crypto.service";
import { UserCryptoService } from "../users/user-crypto.service";
import { UsersService } from "../users/users.service";
import type {
  ImportAttendanceDto,
  ImportBatchDto,
  ImportEnrollmentDto,
  ImportInvoiceDto,
  ImportLocationDto,
  ImportSessionDto,
  ImportStudioDataDto,
} from "./dto/import-studio-data.dto";

type ImportCounts = { created: number; skipped: number };

/** Chennai / IST — IANA has no Asia/Chennai; use Asia/Kolkata. */
const DEFAULT_STUDIO_TIMEZONE = "Asia/Kolkata";

/** Prisma DateTime rejects date-only strings (`YYYY-MM-DD`). */
function importDateTime(dateYmd: string): Date {
  const day = dateYmd.slice(0, 10);
  return new Date(`${day}T12:00:00.000Z`);
}

function audienceForBatchCategory(category: BatchCategory): IndividualAudience {
  return category === "KIDS"
    ? IndividualAudience.KID
    : IndividualAudience.ADULT;
}
@Injectable()
export class DataImportService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(UserCryptoService) private readonly crypto: UserCryptoService,
    @Inject(UsersService) private readonly users: UsersService,
    @Inject(ProjectionService)
    private readonly projections: ProjectionService,
  ) {}

  async importStudioData(actor: DecryptedUser, dto: ImportStudioDataDto) {
    if (!actor.studioId) {
      throw new BadRequestException("User is not assigned to a studio");
    }
    const studioId = actor.studioId;
    const studio = await this.prisma.studio.findUnique({
      where: { id: studioId },
      select: { id: true },
    });
    if (!studio) {
      throw new NotFoundException("Studio not found");
    }

    const students = dto.students ?? [];
    const locations = dto.locations ?? [];
    const batches = dto.batches ?? [];
    const enrollments = dto.enrollments ?? [];
    const sessions = dto.sessions ?? [];
    const invoices = dto.invoices ?? [];
    const attendance = dto.attendance ?? [];

    this.assertOneBatchImport({
      batches,
      enrollments,
      sessions,
      invoices,
      attendance,
    });

    const settings = await this.prisma.studioSettings.findUnique({
      where: { studioId },
      select: { timezone: true },
    });
    const timeZone = settings?.timezone?.trim() || DEFAULT_STUDIO_TIMEZONE;

    const studentResult = await this.users.createStudents(
      studioId,
      students.map(
        ({
          name,
          email,
          gender,
          age,
          dateOfBirth,
          guardianName,
          alternateMobile,
          phone,
        }) => ({
          name,
          email,
          gender,
          ...(age !== undefined && age !== null ? { age } : {}),
          ...(dateOfBirth !== undefined && dateOfBirth !== null
            ? { dateOfBirth }
            : {}),
          ...(guardianName !== undefined && guardianName !== null
            ? { guardianName }
            : {}),
          ...(alternateMobile !== undefined && alternateMobile !== null
            ? { alternateMobile }
            : {}),
          ...(phone !== undefined && phone !== null ? { phone } : {}),
        }),
      ),
    );
    const locationResult = await this.importLocations(studioId, locations);
    const batchResult = await this.importBatches(
      actor.id,
      studioId,
      batches,
      timeZone,
    );
    const enrollmentResult = await this.importEnrollments(
      studioId,
      enrollments,
    );
    const sessionResult = await this.importSessions(
      studioId,
      sessions,
      timeZone,
    );
    const invoiceResult = await this.importInvoices(studioId, invoices);
    const attendanceResult = await this.importAttendance(
      actor,
      studioId,
      attendance,
      timeZone,
    );

    return {
      students: studentResult,
      locations: locationResult,
      batches: batchResult,
      enrollments: enrollmentResult,
      sessions: sessionResult,
      invoices: invoiceResult,
      attendance: attendanceResult,
    };
  }

  private assertOneBatchImport(dto: {
    batches: ImportBatchDto[];
    enrollments: ImportEnrollmentDto[];
    sessions: ImportSessionDto[];
    invoices: ImportInvoiceDto[];
    attendance: ImportAttendanceDto[];
  }) {
    if (dto.batches.length > 1) {
      throw new BadRequestException(
        "Import one batch at a time. The Batches sheet must have a single batch row.",
      );
    }

    const names = new Set<string>();
    if (dto.batches.length === 1) {
      names.add(dto.batches[0]!.name.trim().toLowerCase());
    }
    for (const row of dto.enrollments) {
      names.add(row.batchName.trim().toLowerCase());
    }
    for (const row of dto.sessions) {
      names.add(row.batchName.trim().toLowerCase());
    }
    for (const row of dto.attendance) {
      names.add(row.batchName.trim().toLowerCase());
    }
    for (const row of dto.invoices) {
      if (row.batchName?.trim()) {
        names.add(row.batchName.trim().toLowerCase());
      }
    }
    if (names.size > 1) {
      throw new BadRequestException(
        "Import one batch at a time. All rows must use the same batch name.",
      );
    }
  }

  private async importSessions(
    studioId: string,
    rows: ImportSessionDto[] | undefined,
    timeZone: string,
  ): Promise<ImportCounts> {
    if (!rows || rows.length === 0) {
      return { created: 0, skipped: 0 };
    }

    const [batchIdByName, trainerIdByEmail] = await Promise.all([
      this.resolveBatchIdsByName(
        studioId,
        rows.map((row) => row.batchName),
      ),
      this.resolveTrainerIdsByEmail(
        studioId,
        rows
          .map((row) => row.trainerEmail)
          .filter((email): email is string => Boolean(email)),
      ),
    ]);

    let skipped = 0;
    const seen = new Set<string>();
    const data: Array<{
      batchId: string;
      startsAt: Date;
      endsAt: Date;
      status: SessionStatus;
      type: SessionType;
      trainerId: string | null;
    }> = [];
    const startsAtList: Date[] = [];

    for (const row of rows) {
      const batchId = batchIdByName.get(row.batchName.trim().toLowerCase());
      if (!batchId) {
        skipped += 1;
        continue;
      }
      if (row.trainerEmail) {
        const trainerId = trainerIdByEmail.get(
          row.trainerEmail.trim().toLowerCase(),
        );
        if (!trainerId) {
          skipped += 1;
          continue;
        }
      }
      const startsAt = zonedLocalToUtc(row.date, row.startTime, timeZone);
      const endsAt = row.endTime
        ? zonedLocalToUtc(row.date, row.endTime, timeZone)
        : new Date(startsAt.getTime() + 60 * 60_000);
      if (endsAt <= startsAt) {
        skipped += 1;
        continue;
      }
      const key = `${batchId}:${startsAt.toISOString()}`;
      if (seen.has(key)) {
        skipped += 1;
        continue;
      }
      seen.add(key);
      startsAtList.push(startsAt);
      data.push({
        batchId,
        startsAt,
        endsAt,
        status: row.status,
        type: row.type,
        trainerId: row.trainerEmail
          ? (trainerIdByEmail.get(row.trainerEmail.trim().toLowerCase()) ??
            null)
          : null,
      });
    }

    if (data.length === 0) {
      return { created: 0, skipped };
    }

    const existing = await this.prisma.session.findMany({
      where: {
        batchId: { in: [...new Set(data.map((row) => row.batchId))] },
        startsAt: { in: startsAtList },
      },
      select: { batchId: true, startsAt: true },
    });
    const existingKeys = new Set(
      existing.map(
        (session) => `${session.batchId}:${session.startsAt.toISOString()}`,
      ),
    );

    const toCreate = data.filter(
      (row) =>
        !existingKeys.has(`${row.batchId}:${row.startsAt.toISOString()}`),
    );
    if (toCreate.length > 0) {
      await this.prisma.session.createMany({
        data: toCreate.map(
          ({ batchId, startsAt, endsAt, status, type, trainerId }) => ({
            batchId,
            startsAt,
            endsAt,
            status,
            type,
            trainerId,
          }),
        ),
      });
    }

    return {
      created: toCreate.length,
      skipped: skipped + (data.length - toCreate.length),
    };
  }

  private async importLocations(
    studioId: string,
    rows: ImportLocationDto[] | undefined,
  ): Promise<ImportCounts> {
    if (!rows || rows.length === 0) {
      return { created: 0, skipped: 0 };
    }

    const existing = await this.prisma.studioBranch.findMany({
      where: { studioId },
      select: { id: true, name: true },
    });
    const existingNames = new Set(
      existing.map((branch) => branch.name.trim().toLowerCase()),
    );

    let skipped = 0;
    const data: Array<{
      studioId: string;
      name: string;
      address: string;
      latitude: number | null;
      longitude: number | null;
      description: string | null;
      amenities: string[];
      openingHours: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue;
      pricingBlurb: string | null;
    }> = [];

    for (const row of rows) {
      const name = row.name.trim();
      if (!name || existingNames.has(name.toLowerCase())) {
        skipped += 1;
        continue;
      }
      existingNames.add(name.toLowerCase());
      data.push({
        studioId,
        name,
        address: row.address?.trim() || "",
        latitude: row.latitude ?? null,
        longitude: row.longitude ?? null,
        description: row.description ?? null,
        amenities: (row.amenities ?? [])
          .map((amenity) => amenity.trim())
          .filter(Boolean),
        openingHours:
          (row.openingHours as Prisma.InputJsonValue | undefined) ??
          Prisma.JsonNull,
        pricingBlurb: row.pricingBlurb ?? null,
      });
    }

    if (data.length > 0) {
      await this.prisma.studioBranch.createMany({ data });
    }

    return { created: data.length, skipped };
  }

  private async importBatches(
    creatorId: string,
    studioId: string,
    rows: ImportBatchDto[],
    timeZone: string,
  ): Promise<ImportCounts> {
    if (rows.length === 0) {
      return { created: 0, skipped: 0 };
    }

    const branches = await this.prisma.studioBranch.findMany({
      where: { studioId },
      select: { id: true, name: true },
    });
    const branchByLowerName = new Map(
      branches.map((branch) => [branch.name.trim().toLowerCase(), branch.id]),
    );
    let defaultBranchId = branches[0]?.id ?? null;
    if (defaultBranchId === null) {
      const created = await this.prisma.studioBranch.create({
        data: { studioId, name: "Main Branch", address: "" },
        select: { id: true },
      });
      defaultBranchId = created.id;
      branchByLowerName.set("main branch", created.id);
    }

    const existing = await this.prisma.batch.findMany({
      where: { studioId },
      select: { id: true, name: true },
    });
    const existingNames = new Set(
      existing.map((batch) => batch.name.trim().toLowerCase()),
    );

    let skipped = 0;
    const data: Array<{
      studioId: string;
      branchId: string;
      name: string;
      category: BatchCategory;
      danceCategories: { name: string; description: string }[];
      scheduleJson: {
        frequency: "DAILY" | "WEEKLY";
        weekdays: number[];
        startDate: string;
        endDate: string;
        startTime: string;
        endTime: string;
        utcOffsetMinutes: number;
      };
      capacity: number;
      enrollmentMode: "STAFF_ONLY" | "SELF_JOIN";
      creatorId: string;
      active: boolean;
    }> = [];

    for (const row of rows) {
      const name = row.name.trim();
      if (!name || existingNames.has(name.toLowerCase())) {
        skipped += 1;
        continue;
      }
      const branchId = row.branchName
        ? (branchByLowerName.get(row.branchName.trim().toLowerCase()) ?? null)
        : defaultBranchId;
      if (!branchId) {
        skipped += 1;
        continue;
      }
      if (row.endDate < row.startDate || row.endTime <= row.startTime) {
        skipped += 1;
        continue;
      }
      const styles = (row.danceStyles ?? "")
        .split(",")
        .map((style) => style.trim())
        .filter(Boolean);
      const danceCategories =
        styles.length > 0
          ? styles.map((style) => ({ name: style, description: style }))
          : [{ name: "General", description: "General" }];

      const utcOffsetMinutes =
        row.utcOffsetMinutes !== undefined && row.utcOffsetMinutes !== null
          ? row.utcOffsetMinutes
          : utcOffsetMinutesForZone(
              timeZone,
              new Date(`${row.startDate}T12:00:00.000Z`),
            );

      existingNames.add(name.toLowerCase());
      data.push({
        studioId,
        branchId,
        name,
        category: row.category,
        danceCategories,
        scheduleJson: {
          frequency: row.frequency,
          weekdays: row.weekdays,
          startDate: row.startDate,
          endDate: row.endDate,
          startTime: row.startTime,
          endTime: row.endTime,
          utcOffsetMinutes,
        },
        capacity: row.capacity,
        enrollmentMode: row.enrollmentMode,
        creatorId,
        active: row.active ?? true,
      });
    }

    if (data.length === 0) {
      await this.attachBatchPlansFromRows(studioId, rows);
      return { created: 0, skipped };
    }

    await this.prisma.batch.createMany({ data });

    const createdBatches = await this.prisma.batch.findMany({
      where: {
        studioId,
        name: { in: data.map((row) => row.name) },
      },
      select: { id: true },
    });
    await Promise.all(
      createdBatches.map((batch) =>
        this.projections.refreshBatchSummary(batch.id),
      ),
    );

    await this.attachBatchPlansFromRows(studioId, rows);

    return { created: data.length, skipped };
  }

  private async attachBatchPlansFromRows(
    studioId: string,
    rows: ImportBatchDto[],
  ) {
    const withPlans = rows.filter(
      (row) =>
        Boolean(row.monthlyPlanName?.trim()) ||
        Boolean(row.quarterlyPlanName?.trim()),
    );
    if (withPlans.length === 0) {
      return;
    }

    for (const row of withPlans) {
      const monthlyName = row.monthlyPlanName?.trim() ?? "";
      const quarterlyName = row.quarterlyPlanName?.trim() ?? "";
      if (!monthlyName || !quarterlyName) {
        throw new BadRequestException(
          "Batches with plans need both Monthly plan name and Quarterly plan name.",
        );
      }

      const batch = await this.prisma.batch.findFirst({
        where: {
          studioId,
          name: { equals: row.name.trim(), mode: "insensitive" },
        },
        select: { id: true, category: true },
      });
      if (!batch) {
        throw new BadRequestException(
          `Cannot attach plans: batch "${row.name.trim()}" was not found.`,
        );
      }

      const expectedAudience = audienceForBatchCategory(batch.category);
      const subscriptions = await this.prisma.subscription.findMany({
        where: {
          studioId,
          active: true,
          kind: SubscriptionKind.INDIVIDUAL,
          individualAudience: expectedAudience,
          name: {
            in: [monthlyName, quarterlyName],
            mode: "insensitive",
          },
        },
        select: {
          id: true,
          name: true,
          billingCadence: true,
        },
      });

      const byLowerName = new Map(
        subscriptions.map((sub) => [sub.name.trim().toLowerCase(), sub]),
      );
      const monthly = byLowerName.get(monthlyName.toLowerCase());
      const quarterly = byLowerName.get(quarterlyName.toLowerCase());
      if (!monthly) {
        throw new BadRequestException(
          `Monthly plan "${monthlyName}" was not found for this studio (Individual ${expectedAudience}).`,
        );
      }
      if (!quarterly) {
        throw new BadRequestException(
          `Quarterly plan "${quarterlyName}" was not found for this studio (Individual ${expectedAudience}).`,
        );
      }
      if (monthly.billingCadence !== BillingCadence.MONTHLY) {
        throw new BadRequestException(
          `Plan "${monthly.name}" must be a monthly Individual plan.`,
        );
      }
      if (quarterly.billingCadence !== BillingCadence.QUARTERLY) {
        throw new BadRequestException(
          `Plan "${quarterly.name}" must be a quarterly Individual plan.`,
        );
      }

      await this.prisma.batchPlan.createMany({
        data: [
          { batchId: batch.id, subscriptionId: monthly.id },
          { batchId: batch.id, subscriptionId: quarterly.id },
        ],
        skipDuplicates: true,
      });
    }
  }

  private async importEnrollments(
    studioId: string,
    rows: ImportEnrollmentDto[],
  ): Promise<ImportCounts> {
    if (rows.length === 0) {
      return { created: 0, skipped: 0 };
    }

    const [studentIdByEmail, batchIdByName] = await Promise.all([
      this.resolveStudentIdsByEmail(
        studioId,
        rows.map((row) => row.studentEmail),
      ),
      this.resolveBatchIdsByName(
        studioId,
        rows.map((row) => row.batchName),
      ),
    ]);

    const planNames = [
      ...new Set(
        rows
          .map((row) => row.planName?.trim().toLowerCase())
          .filter((name): name is string => Boolean(name)),
      ),
    ];
    const subscriptions =
      planNames.length === 0
        ? []
        : await this.prisma.subscription.findMany({
            where: {
              studioId,
              active: true,
              kind: SubscriptionKind.INDIVIDUAL,
            },
            select: {
              id: true,
              name: true,
              billingCadence: true,
            },
          });
    const subscriptionByLowerName = new Map(
      subscriptions.map((sub) => [sub.name.trim().toLowerCase(), sub]),
    );

    const batchIds = [...new Set([...batchIdByName.values()])];
    const batchPlans =
      batchIds.length === 0
        ? []
        : await this.prisma.batchPlan.findMany({
            where: { batchId: { in: batchIds } },
            select: { batchId: true, subscriptionId: true },
          });
    const planIdsByBatch = new Map<string, Set<string>>();
    for (const link of batchPlans) {
      const set = planIdsByBatch.get(link.batchId) ?? new Set<string>();
      set.add(link.subscriptionId);
      planIdsByBatch.set(link.batchId, set);
    }

    const batches =
      batchIds.length === 0
        ? []
        : await this.prisma.batch.findMany({
            where: { id: { in: batchIds } },
            select: { id: true, category: true },
          });
    const batchById = new Map(batches.map((batch) => [batch.id, batch]));

    let skipped = 0;
    const seen = new Set<string>();
    const data: Array<{
      batchId: string;
      studentId: string;
      enrolledAt: string;
      status: BatchEnrollmentStatus;
      endedAt: string | null;
      endReason: string | null;
      planName: string | null;
    }> = [];

    for (const row of rows) {
      const studentId = studentIdByEmail.get(
        row.studentEmail.trim().toLowerCase(),
      );
      const batchId = batchIdByName.get(row.batchName.trim().toLowerCase());
      if (!studentId || !batchId) {
        skipped += 1;
        continue;
      }
      const pair = `${batchId}:${studentId}`;
      if (seen.has(pair)) {
        skipped += 1;
        continue;
      }
      if (
        row.status === BatchEnrollmentStatus.ENDED &&
        (!row.endedAt || row.endedAt < row.enrolledAt)
      ) {
        skipped += 1;
        continue;
      }

      const planName = row.planName?.trim() || null;
      if (planName) {
        const subscription = subscriptionByLowerName.get(
          planName.toLowerCase(),
        );
        if (!subscription) {
          throw new BadRequestException(
            `Plan "${planName}" was not found in this studio catalog.`,
          );
        }
        const linked = planIdsByBatch.get(batchId);
        if (!linked?.has(subscription.id)) {
          throw new BadRequestException(
            `Plan "${planName}" is not attached to batch "${row.batchName.trim()}". Add Monthly/Quarterly plan names on the Batches sheet (or batch settings) first.`,
          );
        }
      }

      seen.add(pair);
      data.push({
        batchId,
        studentId,
        enrolledAt: row.enrolledAt,
        status: row.status,
        endedAt: row.endedAt ?? null,
        endReason: row.endReason ?? null,
        planName,
      });
    }

    if (data.length === 0) {
      return { created: 0, skipped };
    }

    const existing = await this.prisma.batchEnrollment.findMany({
      where: {
        OR: data.map(({ batchId, studentId }) => ({ batchId, studentId })),
      },
      select: { batchId: true, studentId: true },
    });
    const existingPairs = new Set(
      existing.map((row) => `${row.batchId}:${row.studentId}`),
    );
    const toCreate = data.filter(
      (row) => !existingPairs.has(`${row.batchId}:${row.studentId}`),
    );

    if (toCreate.length > 0) {
      await this.prisma.batchEnrollment.createMany({
        data: toCreate.map(
          ({ batchId, studentId, enrolledAt, status, endedAt, endReason }) => ({
            batchId,
            studentId,
            enrolledAt: importDateTime(enrolledAt),
            status,
            endedAt: endedAt ? importDateTime(endedAt) : null,
            endReason,
          }),
        ),
      });
      await Promise.all(
        [...new Set(toCreate.map((row) => row.batchId))].map((batchId) =>
          this.projections.refreshBatchSummary(batchId),
        ),
      );
    }

    // Membership for ACTIVE enrollments with a plan. Invoices stay on the
    // Invoices sheet — import does not create a second bill.
    for (const row of toCreate) {
      if (row.status !== BatchEnrollmentStatus.ACTIVE || !row.planName) {
        continue;
      }
      const subscription = subscriptionByLowerName.get(
        row.planName.toLowerCase(),
      );
      const batch = batchById.get(row.batchId);
      if (!subscription || !batch) {
        continue;
      }

      const existingMembership = await this.prisma.membership.findFirst({
        where: {
          purchaserUserId: row.studentId,
          batchId: row.batchId,
          status: MembershipStatus.ACTIVE,
        },
        select: { id: true },
      });
      if (existingMembership) {
        continue;
      }

      const enrolledAt = importDateTime(row.enrolledAt);
      const periodStart = utcMonthStart(enrolledAt);
      const periodEnd = getPeriodEnd(periodStart, subscription.billingCadence);
      const seatRole = seatRoleForBatchCategory(batch.category);

      await this.prisma.membership.create({
        data: {
          subscriptionId: subscription.id,
          purchaserUserId: row.studentId,
          periodStart,
          periodEnd,
          status: MembershipStatus.ACTIVE,
          billingPhase: MembershipBillingPhase.PREPAID,
          batchId: row.batchId,
          coveredStudents: {
            create: {
              studentId: row.studentId,
              seatRole,
            },
          },
        },
      });
    }

    return {
      created: toCreate.length,
      skipped: skipped + (data.length - toCreate.length),
    };
  }

  private async importInvoices(
    studioId: string,
    rows: ImportInvoiceDto[],
  ): Promise<ImportCounts> {
    if (rows.length === 0) {
      return { created: 0, skipped: 0 };
    }

    const [studentIdByEmail, batchIdByName, settings] = await Promise.all([
      this.resolveStudentIdsByEmail(
        studioId,
        rows.map((row) => row.studentEmail),
      ),
      this.resolveBatchIdsByName(
        studioId,
        rows
          .map((row) => row.batchName)
          .filter((name): name is string => Boolean(name?.trim())),
      ),
      this.prisma.studioSettings.findUnique({
        where: { studioId },
        select: { platformFeePercent: true, gstPercent: true },
      }),
    ]);

    const platformFeePercent = settings?.platformFeePercent ?? 5;
    const gstPercent = settings?.gstPercent ?? 0;

    const planNames = [
      ...new Set(
        rows
          .map((row) => row.planName?.trim().toLowerCase())
          .filter((name): name is string => Boolean(name)),
      ),
    ];
    const subscriptions =
      planNames.length === 0
        ? []
        : await this.prisma.subscription.findMany({
            where: {
              studioId,
              active: true,
              kind: SubscriptionKind.INDIVIDUAL,
            },
            select: { id: true, name: true },
          });
    const subscriptionByLowerName = new Map(
      subscriptions.map((sub) => [sub.name.trim().toLowerCase(), sub]),
    );

    let skipped = 0;
    const data: Array<{
      studentId: string;
      studioId: string;
      amount: number;
      referralDiscount: number;
      studioDiscount: number;
      refundedAmount: number;
      status: InvoiceStatus;
      paymentMethod: PaymentMethod | null;
      paidAt: Date | null;
      refundedAt: Date | null;
      platformFeePercent: number;
      gstPercent: number;
      purchaseMeta: Prisma.InputJsonValue | typeof Prisma.JsonNull;
    }> = [];
    const periodsToRefresh = new Set<string>();

    for (const row of rows) {
      const studentId = studentIdByEmail.get(
        row.studentEmail.trim().toLowerCase(),
      );
      if (!studentId) {
        skipped += 1;
        continue;
      }
      const paid = row.status === InvoiceStatus.PAID;
      const refunded = row.status === InvoiceStatus.REFUNDED;
      if (paid && !row.paidAt) {
        skipped += 1;
        continue;
      }
      const batchName = row.batchName?.trim() ?? "";
      const planName = row.planName?.trim() ?? "";
      let subscriptionId: string | undefined;
      if (planName) {
        const subscription = subscriptionByLowerName.get(
          planName.toLowerCase(),
        );
        if (!subscription) {
          throw new BadRequestException(
            `Plan "${planName}" was not found in this studio catalog.`,
          );
        }
        subscriptionId = subscription.id;
      }
      let purchaseMeta: Prisma.InputJsonValue | typeof Prisma.JsonNull =
        Prisma.JsonNull;
      if (batchName || subscriptionId) {
        const meta: Record<string, string> = {};
        if (batchName) {
          const batchId = batchIdByName.get(batchName.toLowerCase());
          if (!batchId) {
            skipped += 1;
            continue;
          }
          meta.batchId = batchId;
        }
        if (subscriptionId) {
          meta.subscriptionId = subscriptionId;
        }
        purchaseMeta = meta;
      }
      const paidAt = row.paidAt ? importDateTime(row.paidAt) : null;
      const refundedAt = row.refundedAt ? importDateTime(row.refundedAt) : null;
      const refundedAmount = row.refundedAmount ?? (refunded ? row.amount : 0);

      if (paidAt) {
        periodsToRefresh.add(currentMonthPeriod(paidAt));
      }
      if (refundedAt) {
        periodsToRefresh.add(currentMonthPeriod(refundedAt));
      }

      data.push({
        studentId,
        studioId,
        amount: row.amount,
        referralDiscount: row.referralDiscount ?? 0,
        studioDiscount: row.studioDiscount ?? 0,
        refundedAmount,
        status: row.status,
        paymentMethod: row.paymentMethod ?? null,
        paidAt,
        refundedAt,
        platformFeePercent,
        gstPercent,
        purchaseMeta,
      });
    }

    if (data.length > 0) {
      await this.prisma.invoice.createMany({ data });
      await Promise.all(
        [...periodsToRefresh].map((period) =>
          this.projections.refreshStudioRevenue(studioId, period),
        ),
      );
    }

    return { created: data.length, skipped };
  }

  private async importAttendance(
    actor: DecryptedUser,
    studioId: string,
    rows: ImportAttendanceDto[] | undefined,
    timeZone: string,
  ): Promise<ImportCounts> {
    if (!rows || rows.length === 0) {
      return { created: 0, skipped: 0 };
    }

    const [studentIdByEmail, batchIdByName] = await Promise.all([
      this.resolveStudentIdsByEmail(
        studioId,
        rows.map((row) => row.studentEmail),
      ),
      this.resolveBatchIdsByName(
        studioId,
        rows.map((row) => row.batchName),
      ),
    ]);

    const batchIds = [...new Set(batchIdByName.values())].filter(Boolean);
    const sessionStarts = new Map<string, Date>();
    const rowKeys = new Set<string>();
    let skipped = 0;
    const rowsBySessionKey = new Map<
      string,
      Array<{ studentId: string; status: AttendanceStatus }>
    >();

    for (const row of rows) {
      const studentId = studentIdByEmail.get(
        row.studentEmail.trim().toLowerCase(),
      );
      const batchId = batchIdByName.get(row.batchName.trim().toLowerCase());
      if (!studentId || !batchId) {
        skipped += 1;
        continue;
      }
      const date = row.date.slice(0, 10);
      const startTime =
        row.startTime && /^([01]\d|2[0-3]):[0-5]\d$/.test(row.startTime)
          ? row.startTime
          : null;
      if (!startTime) {
        skipped += 1;
        continue;
      }
      const startsAt = zonedLocalToUtc(date, startTime, timeZone);
      const key = `${batchId}:${startsAt.toISOString()}`;
      if (!sessionStarts.has(key)) {
        sessionStarts.set(key, startsAt);
      }
      const rowKey = `${key}:${studentId}`;
      if (rowKeys.has(rowKey)) {
        skipped += 1;
        continue;
      }
      rowKeys.add(rowKey);
      const rowsForSession = rowsBySessionKey.get(key) ?? [];
      rowsForSession.push({ studentId, status: row.status });
      rowsBySessionKey.set(key, rowsForSession);
    }

    if (sessionStarts.size === 0) {
      return { created: 0, skipped };
    }

    const existingSessions = await this.prisma.session.findMany({
      where: {
        batchId: { in: batchIds },
        startsAt: { in: [...sessionStarts.values()] },
      },
      select: { id: true, batchId: true, startsAt: true },
    });
    const sessionIdByKey = new Map(
      existingSessions.map((session) => [
        `${session.batchId}:${session.startsAt.toISOString()}`,
        session.id,
      ]),
    );

    const source: AttendanceSource = "DESK";
    const data: Array<{
      sessionId: string;
      studentId: string;
      status: AttendanceStatus;
      markedById: string;
      source: AttendanceSource;
    }> = [];
    let absentSession = 0;
    for (const [key, rowsForSession] of rowsBySessionKey) {
      const sessionId = sessionIdByKey.get(key);
      if (!sessionId) {
        absentSession += rowsForSession.length;
        continue;
      }
      for (const entry of rowsForSession) {
        data.push({
          sessionId,
          studentId: entry.studentId,
          status: entry.status,
          markedById: actor.id,
          source,
        });
      }
    }
    skipped += absentSession;

    if (data.length === 0) {
      return { created: 0, skipped };
    }

    const sessionIds = [...new Set(data.map((row) => row.sessionId))];
    const existingAttendance = await this.prisma.attendance.findMany({
      where: { sessionId: { in: sessionIds } },
      select: { sessionId: true, studentId: true },
    });
    const markedPairs = new Set(
      existingAttendance.map((row) => `${row.sessionId}:${row.studentId}`),
    );

    const toCreate = data.filter((row) => {
      const pair = `${row.sessionId}:${row.studentId}`;
      if (markedPairs.has(pair)) {
        return false;
      }
      markedPairs.add(pair);
      return true;
    });

    if (toCreate.length > 0) {
      await this.prisma.attendance.createMany({ data: toCreate });
    }

    return {
      created: toCreate.length,
      skipped: skipped + (data.length - toCreate.length),
    };
  }

  private async resolveStudentIdsByEmail(
    studioId: string,
    emails: string[],
  ): Promise<Map<string, string>> {
    return this.resolveUserIdsByEmail(studioId, emails, UserRole.STUDENT);
  }

  private async resolveTrainerIdsByEmail(
    studioId: string,
    emails: string[],
  ): Promise<Map<string, string>> {
    return this.resolveUserIdsByEmail(studioId, emails, UserRole.TRAINER);
  }

  private async resolveUserIdsByEmail(
    studioId: string,
    emails: string[],
    role: UserRole,
  ): Promise<Map<string, string>> {
    const unique = [
      ...new Set(emails.map((email) => email.trim().toLowerCase())),
    ];
    if (unique.length === 0) {
      return new Map();
    }
    const emailHashes = unique.map((email) => this.crypto.hashEmail(email));
    const users = await this.prisma.user.findMany({
      where: {
        studioId,
        role,
        emailHash: { in: emailHashes },
      },
      select: { id: true, emailHash: true },
    });
    const idByHash = new Map(users.map((user) => [user.emailHash, user.id]));
    return new Map(
      unique.map((email) => [
        email,
        idByHash.get(this.crypto.hashEmail(email)) ?? "",
      ]),
    );
  }

  private async resolveBatchIdsByName(
    studioId: string,
    names: string[],
  ): Promise<Map<string, string>> {
    const unique = [...new Set(names.map((name) => name.trim()))].filter(
      Boolean,
    );
    if (unique.length === 0) {
      return new Map();
    }
    const batches = await this.prisma.batch.findMany({
      where: {
        studioId,
        name: { in: unique, mode: "insensitive" },
      },
      select: { id: true, name: true },
    });
    return new Map(
      batches.map((batch) => [batch.name.trim().toLowerCase(), batch.id]),
    );
  }
}
