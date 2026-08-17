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
  InvoiceStatus,
  type PaymentMethod,
  Prisma,
  SessionStatus,
  SessionType,
  UserRole,
} from "@prisma/client";
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

    const students = await this.users.createStudents(
      studioId,
      dto.students.map(
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
    const locations = await this.importLocations(studioId, dto.locations);
    const batches = await this.importBatches(actor.id, studioId, dto.batches);
    const enrollments = await this.importEnrollments(studioId, dto.enrollments);
    const sessions = await this.importSessions(studioId, dto.sessions);
    const invoices = await this.importInvoices(studioId, dto.invoices);
    const attendance = await this.importAttendance(
      actor,
      studioId,
      dto.attendance,
    );

    return {
      students,
      locations,
      batches,
      enrollments,
      sessions,
      invoices,
      attendance,
    };
  }

  private async importSessions(
    studioId: string,
    rows: ImportSessionDto[] | undefined,
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
      const startsAt = new Date(`${row.date}T${row.startTime}:00.000Z`);
      const endsAt = row.endTime
        ? new Date(`${row.date}T${row.endTime}:00.000Z`)
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
        amenities: (row.amenities ?? "")
          .split(/[,;]/)
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
          utcOffsetMinutes: row.utcOffsetMinutes ?? 0,
        },
        capacity: row.capacity,
        enrollmentMode: row.enrollmentMode,
        creatorId,
        active: row.active ?? true,
      });
    }

    if (data.length === 0) {
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

    return { created: data.length, skipped };
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

    let skipped = 0;
    const seen = new Set<string>();
    const data: Array<{
      batchId: string;
      studentId: string;
      enrolledAt: string;
      status: BatchEnrollmentStatus;
      endedAt: string | null;
      endReason: string | null;
    }> = [];
    const affectedBatchIds = new Set<string>();

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
      seen.add(pair);
      affectedBatchIds.add(batchId);
      data.push({
        batchId,
        studentId,
        enrolledAt: row.enrolledAt,
        status: row.status,
        endedAt: row.endedAt ?? null,
        endReason: row.endReason ?? null,
      });
    }

    if (data.length > 0) {
      await this.prisma.batchEnrollment.createMany({ data });
      await Promise.all(
        [...affectedBatchIds].map((batchId) =>
          this.projections.refreshBatchSummary(batchId),
        ),
      );
    }

    return { created: data.length, skipped };
  }

  private async importInvoices(
    studioId: string,
    rows: ImportInvoiceDto[],
  ): Promise<ImportCounts> {
    if (rows.length === 0) {
      return { created: 0, skipped: 0 };
    }

    const [studentIdByEmail, settings] = await Promise.all([
      this.resolveStudentIdsByEmail(
        studioId,
        rows.map((row) => row.studentEmail),
      ),
      this.prisma.studioSettings.findUnique({
        where: { studioId },
        select: { platformFeePercent: true, gstPercent: true },
      }),
    ]);

    const platformFeePercent = settings?.platformFeePercent ?? 5;
    const gstPercent = settings?.gstPercent ?? 0;

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
      paidAt: string | null;
      refundedAt: string | null;
      platformFeePercent: number;
      gstPercent: number;
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
      const paidAt = row.paidAt ?? null;
      const refundedAt = row.refundedAt ?? null;
      const refundedAmount = row.refundedAmount ?? (refunded ? row.amount : 0);

      if (paidAt) {
        periodsToRefresh.add(currentMonthPeriod(new Date(paidAt)));
      }
      if (refundedAt) {
        periodsToRefresh.add(currentMonthPeriod(new Date(refundedAt)));
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
    const schedules = batchIds.length
      ? await this.prisma.batch.findMany({
          where: { id: { in: batchIds } },
          select: { id: true, scheduleJson: true },
        })
      : [];
    const startTimeById = new Map(
      schedules.map((batch) => {
        const schedule = batch.scheduleJson as
          | { startTime?: string }
          | null
          | undefined;
        const startTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(
          schedule?.startTime ?? "",
        )
          ? schedule!.startTime!
          : "09:00";
        return [batch.id, startTime];
      }),
    );

    const SESSION_DURATION_MINUTES = 60;
    const sessionStarts = new Map<string, string>();
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
          : (startTimeById.get(batchId) ?? "09:00");
      const startsAt = `${date}T${startTime}:00.000Z`;
      const key = `${batchId}:${startsAt}`;
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

    const missingStarts = [...sessionStarts.entries()].filter(
      ([key]) => !sessionIdByKey.has(key),
    );
    if (missingStarts.length > 0) {
      await this.prisma.session.createMany({
        data: missingStarts.map(([key, startsAt]) => {
          const [batchId] = key.split(":");
          return {
            batchId: batchId!,
            startsAt: new Date(startsAt),
            endsAt: new Date(
              new Date(startsAt).getTime() + SESSION_DURATION_MINUTES * 60_000,
            ),
            status: SessionStatus.COMPLETED,
            type: SessionType.REGULAR,
          };
        }),
      });
      const created = await this.prisma.session.findMany({
        where: {
          batchId: { in: batchIds },
          startsAt: { in: [...sessionStarts.values()] },
        },
        select: { id: true, batchId: true, startsAt: true },
      });
      for (const session of created) {
        sessionIdByKey.set(
          `${session.batchId}:${session.startsAt.toISOString()}`,
          session.id,
        );
      }
    }

    const sessionIds = [...sessionIdByKey.values()];
    const existingAttendance = await this.prisma.attendance.findMany({
      where: { sessionId: { in: sessionIds } },
      select: { sessionId: true, studentId: true },
    });
    const markedPairs = new Set(
      existingAttendance.map((row) => `${row.sessionId}:${row.studentId}`),
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
        const pair = `${sessionId}:${entry.studentId}`;
        if (markedPairs.has(pair)) {
          skipped += 1;
          continue;
        }
        markedPairs.add(pair);
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

    if (data.length > 0) {
      await this.prisma.attendance.createMany({ data });
    }

    return { created: data.length, skipped };
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
