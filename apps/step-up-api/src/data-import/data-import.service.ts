import {
  BadRequestException,
  ConflictException,
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
  InvoiceChargeType,
  InvoiceStatus,
  MembershipBillingPhase,
  MembershipSeatRole,
  MembershipStatus,
  NotificationType,
  type PaymentMethod,
  Prisma,
  SessionStatus,
  type SessionType,
  SubscriptionKind,
  UserRole,
} from "@prisma/client";
import { readPurchaseMetaBatchId } from "../billing/family-combine";
import { ScheduleConflictService } from "../calendar/schedule-conflict.service";
import {
  formatConflictInstant,
  intervalsOverlap,
  type TimeInterval,
} from "../calendar/schedule-conflict";
import {
  utcOffsetMinutesForZone,
  zonedLocalToUtc,
} from "../common/zoned-local-time";
import {
  buildAdmissionInvoiceData,
  readAdmissionFeeAmount,
} from "../memberships/admission-fee";
import {
  getPeriodEnd,
  seatRoleForBatchCategory,
  utcMonthStart,
} from "../memberships/membership-helpers";
import { PrismaService } from "../prisma/prisma.service";
import { importFailureMessage, withDbRetry } from "../prisma/db-retry";
import {
  currentMonthPeriod,
  ProjectionService,
} from "../queues/processors/projection.service";
import { OutboxService } from "../events/outbox.service";
import { NotificationsService } from "../notifications/notifications.service";
import { OUTBOX_EVENT_DATA_IMPORT_REQUESTED } from "../shared/outbox-events";
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
  ImportStudentDto,
} from "./dto/import-studio-data.dto";
import { resolveImportBatchName } from "./import-batch-name";
import {
  buildImportGapInvoices,
  type GapExistingPeriodInput,
  type GapPaidInvoiceInput,
} from "./import-invoice-gaps";
import { ImportLockService } from "./import-lock.service";
import { collectImportPlanPrecheckErrors } from "./import-plan-precheck";
import { sanitizeImportStudioDataDto } from "./sanitize-import-dto";
import {
  buildInitialEntities,
  dtoSliceCount,
  entitySamples,
  type ImportEntityKey,
  type ImportEntitiesSnapshot,
  type ImportJobSnapshot,
  type ImportProgressPatch,
  IMPORT_PROGRESS_CHUNK_SIZE,
} from "./import-job.types";

type ImportCounts = { created: number; skipped: number };

type EntityProgressReporter = (
  entity: ImportEntityKey,
  patch: ImportProgressPatch,
) => Promise<void>;

type RunStudioDataImportResult = {
  students: ImportCounts;
  locations: ImportCounts;
  batches: ImportCounts;
  enrollments: ImportCounts;
  sessions: ImportCounts;
  invoices: ImportCounts & { gapsCreated: number };
  attendance: ImportCounts;
};

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

/** Reject overlapping intervals inside the same import payload (same batch). */
function assertNoOverlappingImportedIntervals(intervals: TimeInterval[]) {
  const sorted = [...intervals].sort(
    (a, b) => a.startsAt.getTime() - b.startsAt.getTime(),
  );
  for (let i = 0; i < sorted.length; i += 1) {
    const left = sorted[i]!;
    for (
      let j = i + 1;
      j < sorted.length && sorted[j]!.startsAt < left.endsAt;
      j += 1
    ) {
      const right = sorted[j]!;
      if (intervalsOverlap(left, right)) {
        throw new ConflictException(
          `Imported sessions overlap at ${formatConflictInstant(right.startsAt)}`,
        );
      }
    }
  }
}

@Injectable()
export class DataImportService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(UserCryptoService) private readonly crypto: UserCryptoService,
    @Inject(UsersService) private readonly users: UsersService,
    @Inject(ProjectionService)
    private readonly projections: ProjectionService,
    @Inject(ScheduleConflictService)
    private readonly scheduleConflicts: ScheduleConflictService,
    @Inject(OutboxService) private readonly outbox: OutboxService,
    @Inject(NotificationsService)
    private readonly notifications: NotificationsService,
    @Inject(ImportLockService)
    private readonly importLock: ImportLockService,
  ) {}

  async precheckStudioImport(actor: DecryptedUser, dto: ImportStudioDataDto) {
    if (!actor.studioId) {
      throw new BadRequestException("User is not assigned to a studio");
    }
    const sanitizedDto = sanitizeImportStudioDataDto(dto);
    const errors = await this.collectImportPlanPrecheckErrors(
      actor.studioId,
      sanitizedDto,
    );
    return { errors };
  }

  async startImportJob(actor: DecryptedUser, dto: ImportStudioDataDto) {
    if (!actor.studioId) {
      throw new BadRequestException("User is not assigned to a studio");
    }
    const sanitizedDto = sanitizeImportStudioDataDto(dto);
    const studioId = actor.studioId;
    const studio = await this.prisma.studio.findUnique({
      where: { id: studioId },
      select: { id: true },
    });
    if (!studio) {
      throw new NotFoundException("Studio not found");
    }

    this.assertOneBatchImport({
      batches: sanitizedDto.batches ?? [],
      enrollments: sanitizedDto.enrollments ?? [],
      sessions: sanitizedDto.sessions ?? [],
      invoices: sanitizedDto.invoices ?? [],
      attendance: sanitizedDto.attendance ?? [],
    });

    const planErrors = await this.collectImportPlanPrecheckErrors(
      studioId,
      sanitizedDto,
    );
    if (planErrors.length > 0) {
      throw new BadRequestException(planErrors[0]);
    }

    const activeImport = await this.importLock.getActiveImport(studioId);
    if (activeImport) {
      throw new ConflictException(
        "An import is already in progress for this studio.",
      );
    }

    const entities = buildInitialEntities(sanitizedDto);
    const importRow = await this.prisma.$transaction(async (tx) => {
      const row = await tx.studioDataImport.create({
        data: {
          studioId,
          requestedByUserId: actor.id,
          status: "PENDING",
          payload: sanitizedDto as Prisma.InputJsonValue,
          entities: entities as Prisma.InputJsonValue,
        },
      });
      await this.outbox.append(
        tx,
        OUTBOX_EVENT_DATA_IMPORT_REQUESTED,
        {
          importId: row.id,
          studioId,
        },
        { studioId },
      );
      return row;
    });

    return { id: importRow.id };
  }

  async importStudioData(actor: DecryptedUser, dto: ImportStudioDataDto) {
    return this.startImportJob(actor, dto);
  }

  async getImportJob(actor: DecryptedUser, importId: string): Promise<ImportJobSnapshot> {
    if (!actor.studioId) {
      throw new BadRequestException("User is not assigned to a studio");
    }
    const row = await this.prisma.studioDataImport.findFirst({
      where: { id: importId, studioId: actor.studioId },
    });
    if (!row) {
      throw new NotFoundException("Import job not found");
    }
    return this.toImportJobSnapshot(row);
  }

  async getActiveImportJob(
    actor: DecryptedUser,
  ): Promise<ImportJobSnapshot | null> {
    if (!actor.studioId) {
      throw new BadRequestException("User is not assigned to a studio");
    }
    const row = await this.importLock.getActiveImport(actor.studioId);
    if (!row) {
      return null;
    }
    return this.toImportJobSnapshot(row);
  }

  async runImportJob(importId: string) {
    const row = await this.prisma.studioDataImport.findUnique({
      where: { id: importId },
    });
    if (!row) {
      return;
    }
    if (row.status === "RUNNING" || row.status === "SUCCEEDED") {
      return;
    }

    const actor: DecryptedUser = {
      id: row.requestedByUserId,
      studioId: row.studioId,
    } as DecryptedUser;
    const dto = row.payload as ImportStudioDataDto;
    const report: EntityProgressReporter = async (entity, patch) => {
      await this.patchImportEntity(importId, entity, patch);
    };

    await this.prisma.studioDataImport.update({
      where: { id: importId },
      data: { status: "RUNNING", startedAt: new Date(), error: null },
    });

    try {
      await withDbRetry(`import job ${importId}`, () =>
        this.runStudioDataImport(actor, dto, report),
      );
      await this.prisma.studioDataImport.update({
        where: { id: importId },
        data: { status: "SUCCEEDED", finishedAt: new Date() },
      });
      await this.notifyImportComplete(actor, dto, importId);
    } catch (error) {
      const message = importFailureMessage(error);
      await this.prisma.studioDataImport.update({
        where: { id: importId },
        data: {
          status: "FAILED",
          finishedAt: new Date(),
          error: message,
        },
      });
      throw error;
    }
  }

  /** Runs all import stages synchronously. Used by the async job runner and unit tests. */
  async runStudioDataImport(
    actor: DecryptedUser,
    dto: ImportStudioDataDto,
    report?: EntityProgressReporter,
  ): Promise<RunStudioDataImportResult> {
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

    const studentResult = await this.runEntityStage(
      "students",
      dto,
      report,
      () => this.importStudentsChunked(studioId, students, async (patch) => {
        if (report) {
          await report("students", patch);
        }
      }),
    );

    const locationResult = await this.runEntityStage(
      "locations",
      dto,
      report,
      () => this.importLocations(studioId, locations),
    );

    const batchResult = await this.runEntityStage(
      "batches",
      dto,
      report,
      () => this.importBatches(actor.id, studioId, batches, timeZone),
    );

    const sessionResult = await this.runEntityStage(
      "sessions",
      dto,
      report,
      () =>
        this.importSessions(studioId, sessions, timeZone, async (patch) => {
          if (report) {
            await report("sessions", patch);
          }
        }),
    );

    const enrollmentResult = await this.runEntityStage(
      "enrollments",
      dto,
      report,
      () =>
        this.importEnrollments(studioId, enrollments, async (patch) => {
          if (report) {
            await report("enrollments", patch);
          }
        }),
    );

    await this.backdateStudentCreatedAtFromEnrollments(studioId, enrollments);

    const invoiceResult = await this.runEntityStage(
      "invoices",
      dto,
      report,
      () =>
        this.importInvoices(studioId, invoices, async (patch) => {
          if (report) {
            await report("invoices", patch);
          }
        }),
    );

    const gapResult = await this.createGapInvoices(studioId, enrollments);

    const attendanceResult = await this.runEntityStage(
      "attendance",
      dto,
      report,
      () =>
        this.importAttendance(
          actor,
          studioId,
          attendance,
          timeZone,
          async (patch) => {
            if (report) {
              await report("attendance", patch);
            }
          },
        ),
    );

    return {
      students: studentResult,
      locations: locationResult,
      batches: batchResult,
      enrollments: enrollmentResult,
      sessions: sessionResult,
      invoices: {
        created: invoiceResult.created,
        skipped: invoiceResult.skipped,
        gapsCreated: gapResult.created,
      },
      attendance: attendanceResult,
    };
  }

  private async runEntityStage(
    entity: ImportEntityKey,
    dto: ImportStudioDataDto,
    report: EntityProgressReporter | undefined,
    run: () => Promise<ImportCounts>,
  ): Promise<ImportCounts> {
    const total = dtoSliceCount(entity, dto);
    if (total === 0) {
      return { created: 0, skipped: 0 };
    }

    if (report) {
      await report(entity, {
        status: "creating",
        processed: 0,
        created: 0,
        skipped: 0,
        samples: entitySamples(entity, dto),
      });
    }

    const result = await run();

    if (report) {
      await report(entity, {
        status: "completed",
        processed: total,
        created: result.created,
        skipped: result.skipped,
      });
    }

    return result;
  }

  private async patchImportEntity(
    importId: string,
    entity: ImportEntityKey,
    patch: ImportProgressPatch,
  ) {
    const row = await this.prisma.studioDataImport.findUnique({
      where: { id: importId },
      select: { entities: true },
    });
    if (!row) {
      return;
    }
    const entities = row.entities as ImportEntitiesSnapshot;
    const current = entities[entity];
    entities[entity] = {
      ...current,
      ...patch,
      samples: patch.samples ?? current.samples,
    };
    if (patch.status === "failed") {
      entities[entity].status = "failed";
    }
    await this.prisma.studioDataImport.update({
      where: { id: importId },
      data: { entities: entities as Prisma.InputJsonValue },
    });
  }

  private toImportJobSnapshot(row: {
    id: string;
    status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";
    error: string | null;
    entities: Prisma.JsonValue;
    payload: Prisma.JsonValue;
  }): ImportJobSnapshot {
    return {
      id: row.id,
      status: row.status,
      error: row.error,
      entities: row.entities as ImportEntitiesSnapshot,
      batchName: resolveImportBatchName(row.payload as ImportStudioDataDto),
    };
  }

  private async importStudentsChunked(
    studioId: string,
    students: ImportStudentDto[],
    onProgress?: (patch: ImportProgressPatch) => Promise<void>,
  ): Promise<ImportCounts> {
    if (students.length === 0) {
      return { created: 0, skipped: 0 };
    }

    let created = 0;
    let skipped = 0;
    let processed = 0;

    for (let i = 0; i < students.length; i += IMPORT_PROGRESS_CHUNK_SIZE) {
      const chunk = students.slice(i, i + IMPORT_PROGRESS_CHUNK_SIZE);
      const result = await this.users.createStudents(
        studioId,
        chunk.map(
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
      created += result.created;
      skipped += result.skipped;
      processed += chunk.length;
      if (onProgress) {
        await onProgress({
          processed,
          created,
          skipped,
          samples: chunk.slice(0, 3).map((student) => student.name),
        });
      }
    }

    return { created, skipped };
  }

  private async collectImportPlanPrecheckErrors(
    studioId: string,
    dto: ImportStudioDataDto,
  ): Promise<string[]> {
    const batches = dto.batches ?? [];
    const enrollments = dto.enrollments ?? [];
    const invoices = dto.invoices ?? [];
    const referencedNames = new Set<string>();
    for (const batch of batches) {
      if (batch.monthlyPlanName?.trim()) {
        referencedNames.add(batch.monthlyPlanName.trim().toLowerCase());
      }
      if (batch.quarterlyPlanName?.trim()) {
        referencedNames.add(batch.quarterlyPlanName.trim().toLowerCase());
      }
    }
    for (const row of enrollments) {
      if (row.planName?.trim()) {
        referencedNames.add(row.planName.trim().toLowerCase());
      }
    }
    for (const row of invoices) {
      if (row.planName?.trim()) {
        referencedNames.add(row.planName.trim().toLowerCase());
      }
    }
    if (referencedNames.size === 0) {
      return [];
    }

    const batchNames = new Set<string>();
    for (const batch of batches) {
      batchNames.add(batch.name.trim().toLowerCase());
    }
    for (const row of enrollments) {
      batchNames.add(row.batchName.trim().toLowerCase());
    }

    const [catalog, existingBatches] = await Promise.all([
      this.prisma.subscription.findMany({
        where: {
          studioId,
          active: true,
          kind: SubscriptionKind.INDIVIDUAL,
        },
        select: {
          id: true,
          name: true,
          billingCadence: true,
          individualAudience: true,
        },
      }),
      batchNames.size === 0
        ? Promise.resolve([])
        : this.prisma.batch.findMany({
            where: {
              studioId,
              name: {
                in: [...batchNames],
                mode: "insensitive",
              },
            },
            select: { id: true, name: true, category: true },
          }),
    ]);

    const batchIds = existingBatches.map((batch) => batch.id);
    const batchPlans =
      batchIds.length === 0
        ? []
        : await this.prisma.batchPlan.findMany({
            where: { batchId: { in: batchIds } },
            select: { batchId: true, subscriptionId: true },
          });
    const batchPlanSubscriptionIdsByBatchId = new Map<string, Set<string>>();
    for (const link of batchPlans) {
      const set =
        batchPlanSubscriptionIdsByBatchId.get(link.batchId) ??
        new Set<string>();
      set.add(link.subscriptionId);
      batchPlanSubscriptionIdsByBatchId.set(link.batchId, set);
    }

    return collectImportPlanPrecheckErrors({
      batches,
      enrollments,
      invoices,
      catalog,
      existingBatches,
      batchPlanSubscriptionIdsByBatchId,
      audienceForBatchCategory,
    });
  }

  private async notifyImportComplete(
    actor: DecryptedUser,
    dto: ImportStudioDataDto,
    importId: string,
  ) {
    const batchName = resolveImportBatchName(dto);
    let batchId: string | null = null;

    if (actor.studioId && batchName) {
      const batch = await this.prisma.batch.findFirst({
        where: {
          studioId: actor.studioId,
          name: { equals: batchName, mode: "insensitive" },
        },
        select: { id: true },
      });
      batchId = batch?.id ?? null;
    }

    await this.notifications.create({
      userId: actor.id,
      type: NotificationType.DATA_IMPORT_COMPLETE,
      batchName: batchName ?? undefined,
      dedupeKey: `DATA_IMPORT_COMPLETE:${importId}`,
      deepLink: batchId ? `/app/batches/${batchId}` : "/app/import",
      entityType: "studio_data_import",
      entityId: importId,
      meta: {
        importId,
        ...(batchName ? { batchName } : {}),
        ...(batchId ? { batchId } : {}),
      },
    });
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
    onProgress?: (patch: ImportProgressPatch) => Promise<void>,
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

      const processed = skipped + data.length;
      if (
        onProgress &&
        processed % IMPORT_PROGRESS_CHUNK_SIZE === 0
      ) {
        await onProgress({
          processed,
          created: 0,
          skipped,
          samples: rows
            .slice(Math.max(0, processed - 3), processed)
            .map((session) => `${session.batchName} · ${session.date}`),
        });
      }
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
      await this.assertImportedSessionSchedule(toCreate);
      let created = 0;
      for (let i = 0; i < toCreate.length; i += IMPORT_PROGRESS_CHUNK_SIZE) {
        const chunk = toCreate.slice(i, i + IMPORT_PROGRESS_CHUNK_SIZE);
        await this.prisma.session.createMany({
          data: chunk.map(
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
        created += chunk.length;
        if (onProgress) {
          const processed =
            skipped + (data.length - toCreate.length) + created;
          await onProgress({
            processed: Math.min(processed, rows.length),
            created,
            skipped,
            samples: rows
              .slice(Math.max(0, created - 3), created)
              .map((session) => `${session.batchName} · ${session.date}`),
          });
        }
      }
    }

    return {
      created: toCreate.length,
      skipped: skipped + (data.length - toCreate.length),
    };
  }

  /**
   * Same branch/trainer gates as live session create — import must not land
   * overlapping classes that the UI would reject.
   */
  private async assertImportedSessionSchedule(
    rows: Array<{
      batchId: string;
      startsAt: Date;
      endsAt: Date;
      status: SessionStatus;
      trainerId: string | null;
    }>,
  ) {
    const active = rows.filter(
      (row) => row.status !== SessionStatus.CANCELLED,
    );
    if (active.length === 0) {
      return;
    }

    const byBatch = new Map<string, typeof active>();
    for (const row of active) {
      const list = byBatch.get(row.batchId) ?? [];
      list.push(row);
      byBatch.set(row.batchId, list);
    }

    for (const batchRows of byBatch.values()) {
      assertNoOverlappingImportedIntervals(
        batchRows.map((row) => ({
          startsAt: row.startsAt,
          endsAt: row.endsAt,
        })),
      );
    }

    const batches = await this.prisma.batch.findMany({
      where: { id: { in: [...byBatch.keys()] } },
      select: {
        id: true,
        branchId: true,
        trainers: { select: { trainerId: true } },
      },
    });
    const batchById = new Map(batches.map((batch) => [batch.id, batch]));

    for (const [batchId, batchRows] of byBatch) {
      const batch = batchById.get(batchId);
      if (!batch) {
        continue;
      }
      const trainerIds = [
        ...new Set([
          ...batch.trainers.map((trainer) => trainer.trainerId),
          ...batchRows
            .map((row) => row.trainerId)
            .filter((id): id is string => Boolean(id)),
        ]),
      ];
      await this.scheduleConflicts.assertNoConflicts({
        intervals: batchRows.map((row) => ({
          startsAt: row.startsAt,
          endsAt: row.endsAt,
        })),
        trainerIds,
        branchId: batch.branchId,
      });
    }
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
        dayTimes?: Array<{
          weekday: number;
          startTime: string;
          endTime: string;
        }>;
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
      const invalidDayTimes = (row.dayTimes ?? []).some(
        (slot) => slot.endTime <= slot.startTime,
      );
      if (
        row.endDate < row.startDate ||
        invalidDayTimes ||
        (!row.dayTimes?.length && row.endTime <= row.startTime)
      ) {
        skipped += 1;
        continue;
      }
      const styles = (row.danceStyles ?? "")
        .split(/[,;]/)
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
          ...(row.dayTimes?.length ? { dayTimes: row.dayTimes } : {}),
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
    onProgress?: (patch: ImportProgressPatch) => Promise<void>,
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

      const processed = skipped + data.length;
      if (onProgress && processed % IMPORT_PROGRESS_CHUNK_SIZE === 0) {
        await onProgress({
          processed,
          created: 0,
          skipped,
          samples: rows
            .slice(Math.max(0, processed - 3), processed)
            .map((enrollment) =>
              `${enrollment.studentEmail} → ${enrollment.batchName}`,
            ),
        });
      }
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

    if (toCreate.length === 0) {
      return {
        created: 0,
        skipped: skipped + data.length,
      };
    }

    // Admission fee before seat writes so priorEnrollment only sees pre-import history.
    const settings = await this.prisma.studioSettings.findUnique({
      where: { studioId },
      select: {
        admissionFee: true,
        platformFeePercent: true,
        gstPercent: true,
      },
    });
    const admissionAmount = readAdmissionFeeAmount(settings);
    if (admissionAmount > 0) {
      const firstEnrollmentByStudent = new Map<
        string,
        { batchId: string; enrolledAt: string }
      >();
      for (const row of toCreate) {
        const current = firstEnrollmentByStudent.get(row.studentId);
        if (!current || row.enrolledAt < current.enrolledAt) {
          firstEnrollmentByStudent.set(row.studentId, {
            batchId: row.batchId,
            enrolledAt: row.enrolledAt,
          });
        }
      }

      const studentIds = [...firstEnrollmentByStudent.keys()];
      const [existingAdmissions, priorEnrollments] = await Promise.all([
        this.prisma.invoice.findMany({
          where: {
            studioId,
            studentId: { in: studentIds },
            chargeType: InvoiceChargeType.ADMISSION,
          },
          select: { studentId: true },
        }),
        this.prisma.batchEnrollment.findMany({
          where: {
            studentId: { in: studentIds },
            batch: { studioId },
          },
          select: { studentId: true },
        }),
      ]);
      const skipStudents = new Set([
        ...existingAdmissions.map((row) => row.studentId),
        ...priorEnrollments.map((row) => row.studentId),
      ]);

      const admissionRows = [...firstEnrollmentByStudent.entries()]
        .filter(([studentId]) => !skipStudents.has(studentId))
        .map(([studentId, first]) =>
          buildAdmissionInvoiceData({
            studentId,
            studioId,
            amount: admissionAmount,
            batchId: first.batchId,
            enrolledAt: importDateTime(first.enrolledAt),
            settings,
          }),
        );

      if (admissionRows.length > 0) {
        await this.prisma.invoice.createMany({ data: admissionRows });
      }
    }

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
    const activeMembershipPairs = new Set<string>();
    const membershipStudentIds = [
      ...new Set(
        toCreate
          .filter(
            (row) =>
              row.status === BatchEnrollmentStatus.ACTIVE && row.planName,
          )
          .map((row) => row.studentId),
      ),
    ];
    const membershipBatchIds = [
      ...new Set(
        toCreate
          .filter(
            (row) =>
              row.status === BatchEnrollmentStatus.ACTIVE && row.planName,
          )
          .map((row) => row.batchId),
      ),
    ];
    if (membershipStudentIds.length > 0 && membershipBatchIds.length > 0) {
      const existingMemberships = await this.prisma.membership.findMany({
        where: {
          purchaserUserId: { in: membershipStudentIds },
          batchId: { in: membershipBatchIds },
          status: MembershipStatus.ACTIVE,
        },
        select: { purchaserUserId: true, batchId: true },
      });
      for (const membership of existingMemberships) {
        if (!membership.batchId) {
          continue;
        }
        activeMembershipPairs.add(
          `${membership.batchId}:${membership.purchaserUserId}`,
        );
      }
    }

    let membershipsCreated = 0;
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

      if (activeMembershipPairs.has(`${row.batchId}:${row.studentId}`)) {
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
      activeMembershipPairs.add(`${row.batchId}:${row.studentId}`);
      membershipsCreated += 1;
      if (
        onProgress &&
        membershipsCreated % IMPORT_PROGRESS_CHUNK_SIZE === 0
      ) {
        const processed = skipped + membershipsCreated;
        await onProgress({
          processed: Math.min(processed, rows.length),
          created: membershipsCreated,
          skipped,
          samples: rows
            .slice(Math.max(0, membershipsCreated - 3), membershipsCreated)
            .map((enrollment) =>
              `${enrollment.studentEmail} → ${enrollment.batchName}`,
            ),
        });
      }
    }

    return {
      created: toCreate.length,
      skipped: skipped + (data.length - toCreate.length),
    };
  }

  private async importInvoices(
    studioId: string,
    rows: ImportInvoiceDto[],
    onProgress?: (patch: ImportProgressPatch) => Promise<void>,
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

    const resolvedStudentIds = [...new Set(studentIdByEmail.values())];
    const resolvedBatchIds = [...new Set(batchIdByName.values())];
    const [memberships, batchRows] = await Promise.all([
      resolvedStudentIds.length === 0 || resolvedBatchIds.length === 0
        ? Promise.resolve([])
        : this.prisma.membership.findMany({
            where: {
              purchaserUserId: { in: resolvedStudentIds },
              batchId: { in: resolvedBatchIds },
              status: MembershipStatus.ACTIVE,
            },
            select: {
              id: true,
              purchaserUserId: true,
              batchId: true,
              subscriptionId: true,
            },
            orderBy: { periodStart: "desc" },
          }),
      resolvedBatchIds.length === 0
        ? Promise.resolve([])
        : this.prisma.batch.findMany({
            where: { id: { in: resolvedBatchIds } },
            select: { id: true, category: true },
          }),
    ]);
    const batchCategoryById = new Map(
      batchRows.map((batch) => [batch.id, batch.category]),
    );
    const membershipByStudentBatch = new Map<string, string>();
    const membershipByStudentBatchSub = new Map<string, string>();
    for (const membership of memberships) {
      if (!membership.batchId) continue;
      const pair = `${membership.purchaserUserId}:${membership.batchId}`;
      if (!membershipByStudentBatch.has(pair)) {
        membershipByStudentBatch.set(pair, membership.id);
      }
      const withSub = `${pair}:${membership.subscriptionId}`;
      if (!membershipByStudentBatchSub.has(withSub)) {
        membershipByStudentBatchSub.set(withSub, membership.id);
      }
    }

    let skipped = 0;
    const data: Array<{
      studentId: string;
      studioId: string;
      membershipId: string | null;
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
      let batchId: string | undefined;
      if (batchName) {
        batchId = batchIdByName.get(batchName.toLowerCase());
        if (!batchId) {
          skipped += 1;
          continue;
        }
      }

      let purchaseMeta: Prisma.InputJsonValue | typeof Prisma.JsonNull =
        Prisma.JsonNull;
      if (batchId && subscriptionId) {
        const category = batchCategoryById.get(batchId);
        const seatRole = category
          ? seatRoleForBatchCategory(category)
          : MembershipSeatRole.KID;
        purchaseMeta = {
          batchId,
          subscriptionId,
          purchaserUserId: studentId,
          coveredStudents: [
            {
              studentId,
              seatRole,
              batchId,
            },
          ],
        };
      } else if (batchId || subscriptionId) {
        const meta: Record<string, string> = {};
        if (batchId) meta.batchId = batchId;
        if (subscriptionId) meta.subscriptionId = subscriptionId;
        purchaseMeta = meta;
      }

      const membershipId =
        batchId && subscriptionId
          ? (membershipByStudentBatchSub.get(
              `${studentId}:${batchId}:${subscriptionId}`,
            ) ?? null)
          : batchId
            ? (membershipByStudentBatch.get(`${studentId}:${batchId}`) ?? null)
            : null;
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
        membershipId,
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

      const processed = skipped + data.length;
      if (onProgress && processed % IMPORT_PROGRESS_CHUNK_SIZE === 0) {
        await onProgress({
          processed,
          created: data.length,
          skipped,
          samples: rows
            .slice(Math.max(0, processed - 3), processed)
            .map((invoice) => `${invoice.studentEmail} · ${invoice.status}`),
        });
      }
    }

    if (data.length > 0) {
      let created = 0;
      for (let i = 0; i < data.length; i += IMPORT_PROGRESS_CHUNK_SIZE) {
        const chunk = data.slice(i, i + IMPORT_PROGRESS_CHUNK_SIZE);
        await this.prisma.invoice.createMany({ data: chunk });
        created += chunk.length;
        if (onProgress) {
          await onProgress({
            processed: Math.min(skipped + created, rows.length),
            created,
            skipped,
            samples: rows
              .slice(Math.max(0, created - 3), created)
              .map((invoice) => `${invoice.studentEmail} · ${invoice.status}`),
          });
        }
      }
      await Promise.all(
        [...periodsToRefresh].map((period) =>
          this.projections.refreshStudioRevenue(studioId, period),
        ),
      );
    }

    return { created: data.length, skipped };
  }

  /**
   * After sheet invoices: create OVERDUE/PENDING invoices for enrollment
   * periods not covered by PAID payments (quarterly cover skips those months).
   */
  private async createGapInvoices(
    studioId: string,
    rows: ImportEnrollmentDto[],
  ): Promise<{ created: number }> {
    const withPlan = rows.filter((row) => row.planName?.trim());
    if (withPlan.length === 0) {
      return { created: 0 };
    }

    const [studentIdByEmail, batchIdByName, settings] = await Promise.all([
      this.resolveStudentIdsByEmail(
        studioId,
        withPlan.map((row) => row.studentEmail),
      ),
      this.resolveBatchIdsByName(
        studioId,
        withPlan.map((row) => row.batchName),
      ),
      this.prisma.studioSettings.findUnique({
        where: { studioId },
        select: { platformFeePercent: true, gstPercent: true },
      }),
    ]);

    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        studioId,
        active: true,
        kind: SubscriptionKind.INDIVIDUAL,
      },
      select: {
        id: true,
        name: true,
        billingCadence: true,
        price: true,
      },
    });
    const subscriptionByLowerName = new Map(
      subscriptions.map((sub) => [sub.name.trim().toLowerCase(), sub]),
    );

    const resolvedBatchIds = [...new Set(batchIdByName.values())];
    const batchRows =
      resolvedBatchIds.length === 0
        ? []
        : await this.prisma.batch.findMany({
            where: { id: { in: resolvedBatchIds } },
            select: { id: true, category: true },
          });
    const batchCategoryById = new Map(
      batchRows.map((batch) => [batch.id, batch.category]),
    );

    const enrollments: Array<{
      studentId: string;
      batchId: string;
      enrolledAt: Date;
      endedAt: Date | null;
      planCadence: BillingCadence;
      planPrice: number;
      subscriptionId: string;
    }> = [];
    for (const row of withPlan) {
      const studentId = studentIdByEmail.get(
        row.studentEmail.trim().toLowerCase(),
      );
      const batchId = batchIdByName.get(row.batchName.trim().toLowerCase());
      const subscription = subscriptionByLowerName.get(
        row.planName!.trim().toLowerCase(),
      );
      if (!studentId || !batchId || !subscription) {
        continue;
      }
      enrollments.push({
        studentId,
        batchId,
        enrolledAt: importDateTime(row.enrolledAt),
        endedAt: row.endedAt ? importDateTime(row.endedAt) : null,
        planCadence: subscription.billingCadence,
        planPrice: Number(subscription.price),
        subscriptionId: subscription.id,
      });
    }

    if (enrollments.length === 0) {
      return { created: 0 };
    }

    const studentIds = [...new Set(enrollments.map((e) => e.studentId))];
    const batchIds = [...new Set(enrollments.map((e) => e.batchId))];

    const existingInvoices = await this.prisma.invoice.findMany({
      where: {
        studioId,
        studentId: { in: studentIds },
      },
      select: {
        studentId: true,
        status: true,
        paidAt: true,
        purchaseMeta: true,
        membershipId: true,
        chargeType: true,
      },
    });

    const paidInvoices: GapPaidInvoiceInput[] = [];
    const existingPeriods: GapExistingPeriodInput[] = [];
    const subById = new Map(subscriptions.map((sub) => [sub.id, sub] as const));

    for (const invoice of existingInvoices) {
      if (invoice.chargeType === InvoiceChargeType.ADMISSION) {
        continue;
      }
      const batchId = readPurchaseMetaBatchId(invoice.purchaseMeta);
      if (!batchId || !batchIds.includes(batchId)) {
        continue;
      }

      const meta =
        invoice.purchaseMeta &&
        typeof invoice.purchaseMeta === "object" &&
        !Array.isArray(invoice.purchaseMeta)
          ? (invoice.purchaseMeta as Record<string, unknown>)
          : null;
      const metaPeriod =
        typeof meta?.periodStart === "string"
          ? new Date(meta.periodStart)
          : null;
      const periodStart =
        metaPeriod && !Number.isNaN(metaPeriod.getTime())
          ? utcMonthStart(metaPeriod)
          : invoice.paidAt
            ? utcMonthStart(invoice.paidAt)
            : null;
      if (periodStart) {
        existingPeriods.push({
          studentId: invoice.studentId,
          batchId,
          periodStart,
        });
      }

      if (invoice.status !== InvoiceStatus.PAID || !invoice.paidAt) {
        continue;
      }
      const subscriptionId =
        typeof meta?.subscriptionId === "string" ? meta.subscriptionId : null;
      const sub = subscriptionId ? subById.get(subscriptionId) : undefined;
      paidInvoices.push({
        studentId: invoice.studentId,
        batchId,
        paidAt: invoice.paidAt,
        cadence: sub?.billingCadence ?? BillingCadence.MONTHLY,
      });
    }

    const gaps = buildImportGapInvoices({
      enrollments,
      paidInvoices,
      existingPeriods,
    });
    if (gaps.length === 0) {
      return { created: 0 };
    }

    const memberships = await this.prisma.membership.findMany({
      where: {
        purchaserUserId: { in: studentIds },
        batchId: { in: batchIds },
        status: MembershipStatus.ACTIVE,
      },
      select: {
        id: true,
        purchaserUserId: true,
        batchId: true,
        subscriptionId: true,
      },
      orderBy: { periodStart: "desc" },
    });
    const membershipByPair = new Map<string, string>();
    for (const membership of memberships) {
      if (!membership.batchId) continue;
      const key = `${membership.purchaserUserId}:${membership.batchId}:${membership.subscriptionId}`;
      if (!membershipByPair.has(key)) {
        membershipByPair.set(key, membership.id);
      }
      const pair = `${membership.purchaserUserId}:${membership.batchId}`;
      if (!membershipByPair.has(pair)) {
        membershipByPair.set(pair, membership.id);
      }
    }

    const platformFeePercent = settings?.platformFeePercent ?? 5;
    const gstPercent = settings?.gstPercent ?? 0;

    await this.prisma.invoice.createMany({
      data: gaps.map((gap) => {
        const category = batchCategoryById.get(gap.batchId);
        const seatRole = category
          ? seatRoleForBatchCategory(category)
          : MembershipSeatRole.KID;
        const membershipId =
          membershipByPair.get(
            `${gap.studentId}:${gap.batchId}:${gap.subscriptionId}`,
          ) ??
          membershipByPair.get(`${gap.studentId}:${gap.batchId}`) ??
          null;
        return {
          studentId: gap.studentId,
          studioId,
          membershipId,
          amount: gap.amount,
          referralDiscount: 0,
          studioDiscount: 0,
          refundedAmount: 0,
          status: gap.status,
          paymentMethod: null,
          paidAt: null,
          refundedAt: null,
          platformFeePercent,
          gstPercent,
          purchaseMeta: {
            batchId: gap.batchId,
            subscriptionId: gap.subscriptionId,
            purchaserUserId: gap.studentId,
            periodStart: gap.periodStart.toISOString(),
            coveredStudents: [
              {
                studentId: gap.studentId,
                seatRole,
                batchId: gap.batchId,
              },
            ],
          },
        };
      }),
    });

    return { created: gaps.length };
  }

  private async importAttendance(
    actor: DecryptedUser,
    studioId: string,
    rows: ImportAttendanceDto[] | undefined,
    timeZone: string,
    onProgress?: (patch: ImportProgressPatch) => Promise<void>,
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

      const processed = skipped + rowKeys.size;
      if (onProgress && processed % IMPORT_PROGRESS_CHUNK_SIZE === 0) {
        await onProgress({
          processed: Math.min(processed, rows.length),
          created: 0,
          skipped,
          samples: rows
            .slice(Math.max(0, processed - 3), processed)
            .map((attendance) =>
              `${attendance.studentEmail} → ${attendance.batchName}`,
            ),
        });
      }
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
      let created = 0;
      for (let i = 0; i < toCreate.length; i += IMPORT_PROGRESS_CHUNK_SIZE) {
        const chunk = toCreate.slice(i, i + IMPORT_PROGRESS_CHUNK_SIZE);
        await this.prisma.attendance.createMany({ data: chunk });
        created += chunk.length;
        if (onProgress) {
          const processed = skipped + created;
          await onProgress({
            processed: Math.min(processed, rows.length),
            created,
            skipped,
            samples: rows
              .slice(Math.max(0, created - 3), created)
              .map((attendance) =>
                `${attendance.studentEmail} → ${attendance.batchName}`,
              ),
          });
        }
      }
    }

    return {
      created: toCreate.length,
      skipped: skipped + (data.length - toCreate.length),
    };
  }

  private earliestEnrollmentDateByEmail(
    rows: ImportEnrollmentDto[],
  ): Map<string, string> {
    const earliest = new Map<string, string>();
    for (const row of rows) {
      const email = row.studentEmail.trim().toLowerCase();
      const enrolledAt = row.enrolledAt.slice(0, 10);
      const current = earliest.get(email);
      if (!current || enrolledAt < current) {
        earliest.set(email, enrolledAt);
      }
    }
    return earliest;
  }

  /**
   * Imported users get `createdAt = now()` on insert. Backdate to the earliest
   * enrollment so directory "New" badges and funnel period filters match history.
   */
  private async backdateStudentCreatedAtFromEnrollments(
    studioId: string,
    rows: ImportEnrollmentDto[],
  ): Promise<void> {
    const earliestByEmail = this.earliestEnrollmentDateByEmail(rows);
    if (earliestByEmail.size === 0) {
      return;
    }

    const studentIdByEmail = await this.resolveStudentIdsByEmail(
      studioId,
      [...earliestByEmail.keys()],
    );

    const targetCreatedAtById = new Map<string, Date>();
    for (const [email, enrolledAt] of earliestByEmail) {
      const studentId = studentIdByEmail.get(email);
      if (!studentId) {
        continue;
      }
      targetCreatedAtById.set(studentId, importDateTime(enrolledAt));
    }
    if (targetCreatedAtById.size === 0) {
      return;
    }

    const students = await this.prisma.user.findMany({
      where: {
        id: { in: [...targetCreatedAtById.keys()] },
        studioId,
        role: UserRole.STUDENT,
      },
      select: { id: true, createdAt: true },
    });

    await Promise.all(
      students
        .filter((student) => {
          const target = targetCreatedAtById.get(student.id);
          return target !== undefined && student.createdAt > target;
        })
        .map((student) =>
          this.prisma.user.update({
            where: { id: student.id },
            data: { createdAt: targetCreatedAtById.get(student.id)! },
          }),
        ),
    );
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
