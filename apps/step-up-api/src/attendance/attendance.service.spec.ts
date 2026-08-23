import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import {
  AttendanceSource,
  AttendanceStatus,
  NotificationType,
  UserRole,
} from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeSession } from "../test/fixtures/sessions";
import { FIXTURE_USERS } from "../test/fixtures/users";
import { createNotificationsMock } from "../test/mocks/notifications.mock";
import { createImportLockMock } from "../test/mocks/import-lock.mock";
import { AttendanceService } from "./attendance.service";

const importLock = createImportLockMock();

describe("AttendanceService.markAttendance", () => {
  const prisma = {
    session: { findUnique: vi.fn() },
    attendance: { upsert: vi.fn() },
    parentChild: { findUnique: vi.fn() },
    booking: { findFirst: vi.fn() },
    batchEnrollment: { findFirst: vi.fn() },
  };
  const memberships = {
    findActiveForBatch: vi.fn(),
  };
  const notifications = createNotificationsMock();
  const config = {
    get: vi.fn((key: string) =>
      key === "SESSION_QR_SECRET" ? "test-qr-secret" : undefined,
    ),
  };
  const crypto = {
    decryptUser: (user: unknown) => user,
  };

  let service: AttendanceService;

  beforeEach(() => {
    vi.clearAllMocks();
    config.get.mockImplementation((key: string) =>
      key === "SESSION_QR_SECRET" ? "test-qr-secret" : undefined,
    );
    prisma.booking.findFirst.mockResolvedValue(null);
    prisma.batchEnrollment.findFirst.mockResolvedValue(null);
    service = new AttendanceService(
      prisma as never,
      memberships as never,
      notifications as never,
      config as never,
      crypto as never,
      importLock as never,
    );
  });

  it("upserts PRESENT without creating a notification", async () => {
    const session = makeSession();
    prisma.session.findUnique.mockResolvedValue(session);
    memberships.findActiveForBatch.mockResolvedValue({ id: "mem-1" });
    prisma.attendance.upsert.mockResolvedValue({
      id: "att-1",
      status: AttendanceStatus.PRESENT,
      student: FIXTURE_USERS.student,
    });

    await service.markAttendance({
      sessionId: session.id,
      studentId: FIXTURE_USERS.student.id,
      status: AttendanceStatus.PRESENT,
      markedById: FIXTURE_USERS.trainer.id,
      source: AttendanceSource.TRAINER,
    });

    expect(prisma.attendance.upsert).toHaveBeenCalled();
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it("creates MISSED_SESSION when status is ABSENT", async () => {
    const session = makeSession();
    prisma.session.findUnique.mockResolvedValue(session);
    memberships.findActiveForBatch.mockResolvedValue({ id: "mem-1" });
    prisma.attendance.upsert.mockResolvedValue({
      id: "att-1",
      status: AttendanceStatus.ABSENT,
      student: FIXTURE_USERS.student,
    });

    await service.markAttendance({
      sessionId: session.id,
      studentId: FIXTURE_USERS.student.id,
      status: AttendanceStatus.ABSENT,
      markedById: FIXTURE_USERS.trainer.id,
      source: AttendanceSource.TRAINER,
    });

    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: FIXTURE_USERS.student.id,
        type: NotificationType.MISSED_SESSION,
        batchName: session.batch.name,
        sessionDate: session.startsAt.toISOString().slice(0, 10),
        dedupeKey: `MISSED_SESSION:${session.id}:${FIXTURE_USERS.student.id}`,
        entityType: "session",
        entityId: session.id,
        meta: { sessionId: session.id, batchId: session.batchId },
      }),
    );
  });

  it("rejects when session is missing", async () => {
    prisma.session.findUnique.mockResolvedValue(null);

    await expect(
      service.markAttendance({
        sessionId: "missing",
        studentId: FIXTURE_USERS.student.id,
        status: AttendanceStatus.PRESENT,
        markedById: FIXTURE_USERS.trainer.id,
        source: AttendanceSource.TRAINER,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it("rejects marking attendance before the session starts", async () => {
    const session = makeSession({
      startsAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    prisma.session.findUnique.mockResolvedValue(session);

    await expect(
      service.markAttendance({
        sessionId: session.id,
        studentId: FIXTURE_USERS.student.id,
        status: AttendanceStatus.PRESENT,
        markedById: FIXTURE_USERS.trainer.id,
        source: AttendanceSource.TRAINER,
      }),
    ).rejects.toThrow(/before the session starts/);
    expect(prisma.attendance.upsert).not.toHaveBeenCalled();
    expect(memberships.findActiveForBatch).not.toHaveBeenCalled();
  });

  it("allows marking attendance within the early window", async () => {
    const session = makeSession({
      startsAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    prisma.session.findUnique.mockResolvedValue(session);
    memberships.findActiveForBatch.mockResolvedValue({ id: "mem-1" });
    prisma.attendance.upsert.mockResolvedValue({
      id: "att-early",
      status: AttendanceStatus.PRESENT,
      student: FIXTURE_USERS.student,
    });

    await service.markAttendance({
      sessionId: session.id,
      studentId: FIXTURE_USERS.student.id,
      status: AttendanceStatus.PRESENT,
      markedById: FIXTURE_USERS.trainer.id,
      source: AttendanceSource.TRAINER,
    });

    expect(prisma.attendance.upsert).toHaveBeenCalled();
  });

  it("rejects when student has no enrollment, membership, or trial", async () => {
    prisma.session.findUnique.mockResolvedValue(makeSession());
    memberships.findActiveForBatch.mockResolvedValue(null);
    prisma.batchEnrollment.findFirst.mockResolvedValue(null);
    prisma.booking.findFirst.mockResolvedValue(null);

    await expect(
      service.markAttendance({
        sessionId: "session-kids-mon",
        studentId: FIXTURE_USERS.student.id,
        status: AttendanceStatus.ABSENT,
        markedById: FIXTURE_USERS.trainer.id,
        source: AttendanceSource.TRAINER,
      }),
    ).rejects.toThrow(/not enrolled or booked/);
    expect(prisma.attendance.upsert).not.toHaveBeenCalled();
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it("allows marking enrolled students without an active membership (unpaid)", async () => {
    const session = makeSession();
    prisma.session.findUnique.mockResolvedValue(session);
    memberships.findActiveForBatch.mockResolvedValue(null);
    prisma.batchEnrollment.findFirst.mockResolvedValue({ id: "enroll-1" });
    prisma.attendance.upsert.mockResolvedValue({
      id: "att-unpaid",
      status: AttendanceStatus.PRESENT,
      student: FIXTURE_USERS.student,
    });

    await service.markAttendance({
      sessionId: session.id,
      studentId: FIXTURE_USERS.student.id,
      status: AttendanceStatus.PRESENT,
      markedById: FIXTURE_USERS.trainer.id,
      source: AttendanceSource.TRAINER,
    });

    expect(prisma.batchEnrollment.findFirst).toHaveBeenCalled();
    expect(prisma.booking.findFirst).not.toHaveBeenCalled();
    expect(prisma.attendance.upsert).toHaveBeenCalled();
  });

  it("allows markAttendance when TRIAL booking exists for the session", async () => {
    const session = makeSession();
    prisma.session.findUnique.mockResolvedValue(session);
    memberships.findActiveForBatch.mockResolvedValue(null);
    prisma.batchEnrollment.findFirst.mockResolvedValue(null);
    prisma.booking.findFirst.mockResolvedValue({
      id: "booking-trial",
      type: "TRIAL",
      sessionId: session.id,
    });
    prisma.attendance.upsert.mockResolvedValue({
      id: "att-trial",
      status: AttendanceStatus.PRESENT,
      student: FIXTURE_USERS.student,
    });

    await service.markAttendance({
      sessionId: session.id,
      studentId: FIXTURE_USERS.student.id,
      status: AttendanceStatus.PRESENT,
      markedById: FIXTURE_USERS.trainer.id,
      source: AttendanceSource.TRAINER,
    });

    expect(prisma.attendance.upsert).toHaveBeenCalled();
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it("rejects when no enrollment or TRIAL booking exists for the session", async () => {
    const session = makeSession();
    prisma.session.findUnique.mockResolvedValue(session);
    memberships.findActiveForBatch.mockResolvedValue(null);
    prisma.batchEnrollment.findFirst.mockResolvedValue(null);
    prisma.booking.findFirst.mockResolvedValue(null);

    await expect(
      service.markAttendance({
        sessionId: session.id,
        studentId: FIXTURE_USERS.student.id,
        status: AttendanceStatus.PRESENT,
        markedById: FIXTURE_USERS.trainer.id,
        source: AttendanceSource.TRAINER,
      }),
    ).rejects.toThrow(/not enrolled or booked/);
    expect(prisma.attendance.upsert).not.toHaveBeenCalled();
  });
});

describe("AttendanceService.markAllPresent", () => {
  const prisma = {
    session: { findUnique: vi.fn() },
    batchEnrollment: { findMany: vi.fn(), findFirst: vi.fn() },
    attendance: { upsert: vi.fn() },
    parentChild: { findUnique: vi.fn() },
    booking: { findMany: vi.fn(), findFirst: vi.fn() },
    user: { findUnique: vi.fn() },
    invoice: { findMany: vi.fn() },
  };
  const memberships = {
    findActiveForBatch: vi.fn(),
    findMonthlyUnpaidStudentIds: vi.fn(),
  };
  const notifications = createNotificationsMock();
  const config = {
    get: vi.fn(() => "test-qr-secret"),
  };
  const crypto = {
    decryptUser: (user: { name: string }) => user,
  };

  let service: AttendanceService;

  beforeEach(() => {
    vi.clearAllMocks();
    memberships.findMonthlyUnpaidStudentIds.mockResolvedValue(new Set());
    prisma.booking.findMany.mockResolvedValue([]);
    prisma.booking.findFirst.mockResolvedValue(null);
    prisma.batchEnrollment.findFirst.mockResolvedValue(null);
    prisma.invoice.findMany.mockResolvedValue([]);
    service = new AttendanceService(
      prisma as never,
      memberships as never,
      notifications as never,
      config as never,
      crypto as never,
      importLock as never,
    );
  });

  it("marks unmarked and non-present roster students present", async () => {
    const session = makeSession();
    prisma.session.findUnique.mockResolvedValue({
      ...session,
      batchId: session.batchId ?? "batch-1",
      startsAt: session.startsAt ?? new Date("2026-08-01T10:00:00.000Z"),
      batch: {
        ...session.batch,
        id: "batch-1",
      },
      attendance: [
        {
          id: "a1",
          studentId: "s2",
          status: AttendanceStatus.PRESENT,
          source: AttendanceSource.TRAINER,
        },
        {
          id: "a2",
          studentId: "s3",
          status: AttendanceStatus.ABSENT,
          source: AttendanceSource.TRAINER,
        },
      ],
    });
    prisma.batchEnrollment.findMany.mockResolvedValue([
      { studentId: "s1", student: { name: "Ada" }, status: "ACTIVE" },
      { studentId: "s2", student: { name: "Grace" }, status: "ACTIVE" },
      { studentId: "s3", student: { name: "Marie" }, status: "ACTIVE" },
    ]);
    memberships.findActiveForBatch.mockResolvedValue({ id: "mem-1" });
    prisma.attendance.upsert.mockResolvedValue({
      id: "att-new",
      status: AttendanceStatus.PRESENT,
      student: { name: "Ada" },
    });

    const result = await service.markAllPresent(
      session.id,
      FIXTURE_USERS.trainer.id,
    );

    expect(result).toEqual({ marked: 2, failed: 0 });
    expect(prisma.attendance.upsert).toHaveBeenCalledTimes(2);
  });

  it("returns zeros when everyone is already present", async () => {
    const session = makeSession();
    prisma.session.findUnique.mockResolvedValue({
      ...session,
      batchId: session.batchId ?? "batch-1",
      startsAt: session.startsAt ?? new Date("2026-08-01T10:00:00.000Z"),
      batch: {
        ...session.batch,
        id: "batch-1",
      },
      attendance: [
        {
          id: "a1",
          studentId: "s1",
          status: AttendanceStatus.PRESENT,
          source: AttendanceSource.TRAINER,
        },
      ],
    });
    prisma.batchEnrollment.findMany.mockResolvedValue([
      { studentId: "s1", student: { name: "Ada" }, status: "ACTIVE" },
    ]);

    await expect(
      service.markAllPresent(session.id, FIXTURE_USERS.trainer.id),
    ).resolves.toEqual({ marked: 0, failed: 0 });
    expect(prisma.attendance.upsert).not.toHaveBeenCalled();
  });

  it("skips attendance-only orphans that cannot be marked", async () => {
    const session = makeSession();
    prisma.session.findUnique.mockResolvedValue({
      ...session,
      batchId: session.batchId ?? "batch-1",
      startsAt: session.startsAt ?? new Date("2026-08-01T10:00:00.000Z"),
      batch: {
        ...session.batch,
        id: "batch-1",
      },
      attendance: [
        {
          id: "a-orphan",
          studentId: "orphan-1",
          status: AttendanceStatus.ABSENT,
          source: AttendanceSource.TRAINER,
        },
      ],
    });
    prisma.batchEnrollment.findMany.mockResolvedValue([
      { studentId: "s1", student: { name: "Ada" }, status: "ACTIVE" },
    ]);
    prisma.user.findUnique.mockResolvedValue({ name: "Orphan" });
    memberships.findActiveForBatch.mockResolvedValue({ id: "mem-1" });
    prisma.attendance.upsert.mockResolvedValue({
      id: "att-new",
      status: AttendanceStatus.PRESENT,
      student: { name: "Ada" },
    });

    const result = await service.markAllPresent(
      session.id,
      FIXTURE_USERS.trainer.id,
    );

    expect(result).toEqual({ marked: 1, failed: 0 });
    expect(prisma.attendance.upsert).toHaveBeenCalledTimes(1);
  });
});

describe("AttendanceService QR", () => {
  const prisma = {
    session: { findUnique: vi.fn() },
    attendance: { upsert: vi.fn() },
    parentChild: { findUnique: vi.fn() },
  };
  const memberships = {
    findActiveForBatch: vi.fn(),
  };
  const notifications = createNotificationsMock();
  const config = {
    get: vi.fn((key: string) =>
      key === "SESSION_QR_SECRET" ? "test-qr-secret" : undefined,
    ),
  };
  const crypto = {
    decryptUser: (user: unknown) => user,
  };

  let service: AttendanceService;

  beforeEach(() => {
    vi.clearAllMocks();
    config.get.mockImplementation((key: string) =>
      key === "SESSION_QR_SECRET" ? "test-qr-secret" : undefined,
    );
    service = new AttendanceService(
      prisma as never,
      memberships as never,
      notifications as never,
      config as never,
      crypto as never,
      importLock as never,
    );
  });

  it("creates a signed QR token for a session", async () => {
    const session = makeSession({
      startsAt: new Date(Date.now() + 5 * 60 * 1000),
      endsAt: new Date(Date.now() + 65 * 60 * 1000),
    });
    prisma.session.findUnique.mockResolvedValue(session);

    const result = await service.createSessionQrToken(session.id);

    expect(result.token.length).toBeGreaterThan(10);
    expect(result.expiresAt).toBe(session.endsAt.toISOString());
  });

  it("rejects QR create when secret is missing", async () => {
    config.get.mockReturnValue(undefined);
    await expect(
      service.createSessionQrToken("session-kids-mon"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("marks PRESENT via valid QR for a student", async () => {
    const session = makeSession({
      startsAt: new Date(Date.now() - 5 * 60 * 1000),
      endsAt: new Date(Date.now() + 55 * 60 * 1000),
    });
    prisma.session.findUnique
      .mockResolvedValueOnce(session)
      .mockResolvedValueOnce(session);
    memberships.findActiveForBatch.mockResolvedValue({ id: "mem-1" });
    prisma.attendance.upsert.mockResolvedValue({
      id: "att-qr",
      status: AttendanceStatus.PRESENT,
      student: FIXTURE_USERS.student,
    });

    const { token } = await service.createSessionQrToken(session.id);
    await service.verifyQrAndMark(
      token,
      FIXTURE_USERS.student.id,
      UserRole.STUDENT,
    );

    expect(prisma.attendance.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          source: AttendanceSource.QR,
          status: AttendanceStatus.PRESENT,
          studentId: FIXTURE_USERS.student.id,
        }),
      }),
    );
  });

  it("requires child studentId for parent QR check-in", async () => {
    await expect(
      service.verifyQrAndMark(
        "not-a-token",
        FIXTURE_USERS.parent.id,
        UserRole.PARENT,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects parent QR when child is not linked", async () => {
    prisma.parentChild.findUnique.mockResolvedValue(null);

    await expect(
      service.verifyQrAndMark(
        "token",
        FIXTURE_USERS.parent.id,
        UserRole.PARENT,
        FIXTURE_USERS.student.id,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects invalid QR signatures", async () => {
    const bogus = Buffer.from(
      "session-kids-mon|1|2|not-a-real-signature",
    ).toString("base64url");

    await expect(
      service.verifyQrAndMark(
        bogus,
        FIXTURE_USERS.student.id,
        UserRole.STUDENT,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe("AttendanceService.getSessionRoster", () => {
  const prisma = {
    session: { findUnique: vi.fn() },
    batchEnrollment: { findMany: vi.fn() },
    attendance: { findMany: vi.fn(), upsert: vi.fn() },
    parentChild: { findUnique: vi.fn() },
    booking: { findMany: vi.fn(), findFirst: vi.fn() },
    invoice: { findMany: vi.fn() },
    subscription: { findMany: vi.fn().mockResolvedValue([]) },
    user: { findUnique: vi.fn() },
  };
  const memberships = {
    findActiveForBatch: vi.fn(),
    findMonthlyUnpaidStudentIds: vi.fn(),
  };
  const notifications = createNotificationsMock();
  const config = { get: vi.fn(() => "test-qr-secret") };
  const crypto = {
    decryptUser: (user: { name: string }) => ({ ...user, name: user.name }),
  };

  let service: AttendanceService;

  beforeEach(() => {
    vi.clearAllMocks();
    memberships.findMonthlyUnpaidStudentIds.mockResolvedValue(new Set(["s2"]));
    prisma.booking.findMany.mockResolvedValue([]);
    prisma.booking.findFirst.mockResolvedValue(null);
    prisma.invoice.findMany.mockResolvedValue([]);
    service = new AttendanceService(
      prisma as never,
      memberships as never,
      notifications as never,
      config as never,
      crypto as never,
      importLock as never,
    );
  });

  it("maps enrollments to roster with attendance", async () => {
    prisma.session.findUnique.mockResolvedValue({
      id: "session-1",
      batchId: "batch-1",
      startsAt: new Date("2026-08-01T10:00:00.000Z"),
      batch: { id: "batch-1", studioId: "studio-1" },
      attendance: [
        {
          id: "a1",
          studentId: "s1",
          status: AttendanceStatus.PRESENT,
          source: AttendanceSource.TRAINER,
        },
      ],
    });
    prisma.batchEnrollment.findMany.mockResolvedValue([
      { studentId: "s1", student: { name: "Ada" }, status: "ACTIVE" },
      { studentId: "s2", student: { name: "Grace" }, status: "ACTIVE" },
    ]);
    prisma.invoice.findMany.mockResolvedValue([
      {
        studentId: "s1",
        combineMeta: null,
        membership: {
          subscription: { billingCadence: "MONTHLY" },
        },
      },
      {
        studentId: "s1",
        combineMeta: null,
        membership: {
          subscription: { billingCadence: "QUARTERLY" },
        },
      },
    ]);

    const roster = await service.getSessionRoster("session-1");

    expect(memberships.findMonthlyUnpaidStudentIds).toHaveBeenCalledWith([
      "s1",
      "s2",
    ]);
    expect(prisma.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          studioId: "studio-1",
          OR: expect.arrayContaining([
            { studentId: { in: ["s1", "s2"] } },
          ]),
        }),
      }),
    );
    expect(roster).toEqual([
      expect.objectContaining({
        studentId: "s1",
        isTrial: false,
        monthlyUnpaid: false,
        paidMonths: 4,
        attendance: expect.objectContaining({
          status: AttendanceStatus.PRESENT,
        }),
      }),
      expect.objectContaining({
        studentId: "s2",
        isTrial: false,
        monthlyUnpaid: true,
        paidMonths: 0,
        attendance: null,
      }),
    ]);
  });

  it("credits paid months to combineMeta source students on the roster", async () => {
    prisma.session.findUnique.mockResolvedValue({
      id: "session-1",
      batchId: "batch-1",
      startsAt: new Date("2026-08-01T10:00:00.000Z"),
      batch: { id: "batch-1", studioId: "studio-1" },
      attendance: [],
    });
    prisma.batchEnrollment.findMany.mockResolvedValue([
      { studentId: "s1", student: { name: "Ada" }, status: "ACTIVE" },
      { studentId: "s2", student: { name: "Grace" }, status: "ACTIVE" },
    ]);
    memberships.findMonthlyUnpaidStudentIds.mockResolvedValue(new Set());
    prisma.invoice.findMany.mockResolvedValue([
      {
        studentId: "s1",
        combineMeta: {
          sources: [
            {
              invoiceId: "i1",
              studentId: "s1",
              batchId: "batch-1",
              originalAmount: 1000,
              allocatedDiscount: 100,
              netAmount: 900,
            },
            {
              invoiceId: "i2",
              studentId: "s2",
              batchId: "batch-1",
              originalAmount: 1000,
              allocatedDiscount: 100,
              netAmount: 900,
            },
          ],
        },
        membership: null,
      },
    ]);

    const roster = await service.getSessionRoster("session-1");

    expect(roster).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ studentId: "s1", paidMonths: 1 }),
        expect.objectContaining({ studentId: "s2", paidMonths: 1 }),
      ]),
    );
  });

  it("rejects missing session", async () => {
    prisma.session.findUnique.mockResolvedValue(null);
    await expect(service.getSessionRoster("missing")).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("lists attendance rows for a session", async () => {
    prisma.attendance.findMany.mockResolvedValue([
      {
        id: "a1",
        student: { name: "Ada" },
        markedBy: { name: "Trainer" },
      },
    ]);

    const rows = await service.listBySession("session-1");

    expect(prisma.attendance.findMany).toHaveBeenCalledWith({
      where: { sessionId: "session-1" },
      include: { student: true, markedBy: true },
    });
    expect(rows[0]?.student).toEqual({ name: "Ada" });
    expect(rows[0]?.markedBy).toEqual({ name: "Trainer" });
  });
});
