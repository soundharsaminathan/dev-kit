import {
  BatchCategory,
  BatchEnrollmentStatus,
  InvoiceStatus,
} from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { DataImportService } from "./data-import.service";

const ACTOR = {
  id: "user-owner-1",
  studioId: "studio-1",
  role: "OWNER",
} as never;

function buildService(
  overrides: {
    prisma?: Record<string, unknown>;
    crypto?: Record<string, unknown>;
    users?: Record<string, unknown>;
    projections?: Record<string, unknown>;
  } = {},
) {
  const prisma = {
    studio: { findUnique: vi.fn().mockResolvedValue({ id: "studio-1" }) },
    studioBranch: { findMany: vi.fn().mockResolvedValue([]) },
    batch: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    batchPlan: {
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    batchEnrollment: {
      findMany: vi.fn().mockResolvedValue([]),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    subscription: { findMany: vi.fn().mockResolvedValue([]) },
    membership: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: "mem-1" }),
    },
    invoice: {
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    session: { findMany: vi.fn().mockResolvedValue([]) },
    attendance: {
      findMany: vi.fn().mockResolvedValue([]),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    studioSettings: {
      findUnique: vi.fn().mockResolvedValue({
        timezone: "UTC",
        platformFeePercent: 5,
        gstPercent: 0,
      }),
    },
    user: { findMany: vi.fn().mockResolvedValue([]) },
    ...overrides.prisma,
  };
  const crypto = {
    hashEmail: vi.fn((email: string) => `hash:${email}`),
    ...overrides.crypto,
  };
  const users = {
    createStudents: vi.fn().mockResolvedValue({ created: 0, skipped: 0 }),
    ...overrides.users,
  };
  const projections = {
    refreshBatchSummary: vi.fn().mockResolvedValue(null),
    refreshStudioRevenue: vi.fn().mockResolvedValue(null),
    ...overrides.projections,
  };
  const service = new DataImportService(
    prisma as never,
    crypto as never,
    users as never,
    projections as never,
  );
  return { service, prisma, crypto, users, projections };
}

const STUDENTS = [
  {
    name: "Ada Lovelace",
    email: "ada@example.com",
    gender: "FEMALE",
    age: 28,
    dateOfBirth: null,
    phone: null,
    guardianName: null,
    alternateMobile: null,
  },
];

describe("DataImportService.importStudioData", () => {
  it("rejects when the actor has no studio", async () => {
    const { service } = buildService();
    await expect(
      service.importStudioData({ ...ACTOR, studioId: null } as never, {
        students: [],
        batches: [],
        enrollments: [],
        invoices: [],
      }),
    ).rejects.toThrow("User is not assigned to a studio");
  });

  it("rejects when the studio does not exist", async () => {
    const { service, prisma } = buildService();
    prisma.studio.findUnique.mockResolvedValue(null);
    await expect(
      service.importStudioData(ACTOR, {
        students: [],
        batches: [],
        enrollments: [],
        invoices: [],
      }),
    ).rejects.toThrow("Studio not found");
  });

  it("creates batches with a fallback branch and refreshes summaries", async () => {
    const { service, prisma, projections } = buildService({
      prisma: {
        studioBranch: {
          findMany: vi
            .fn()
            .mockResolvedValue([{ id: "branch-main", name: "Main Branch" }]),
        },
        batch: {
          findMany: vi
            .fn()
            .mockResolvedValue([{ id: "batch-1", name: "Existing Batch" }]),
          createMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      },
    });

    const result = await service.importStudioData(ACTOR, {
      students: [],
      batches: [
        {
          name: "Kids Hip-Hop",
          category: BatchCategory.KIDS,
          branchName: null,
          danceStyles: "Hip-Hop; Jazz",
          frequency: "WEEKLY",
          weekdays: [1, 3],
          startTime: "16:00",
          endTime: "17:00",
          startDate: "2024-06-03",
          endDate: "2025-03-31",
          utcOffsetMinutes: 330,
          capacity: 12,
          enrollmentMode: "STAFF_ONLY",
          active: true,
        },
      ],
      enrollments: [],
      invoices: [],
    });

    expect(result.batches).toEqual({ created: 1, skipped: 0 });
    expect(prisma.batch.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          name: "Kids Hip-Hop",
          branchId: "branch-main",
          scheduleJson: expect.objectContaining({
            utcOffsetMinutes: 330,
          }),
        }),
      ],
    });
    expect(projections.refreshBatchSummary).toHaveBeenCalled();
  });

  it("rejects more than one batch in a single import", async () => {
    const { service } = buildService();
    await expect(
      service.importStudioData(ACTOR, {
        students: [],
        batches: [
          {
            name: "Kids Hip-Hop",
            category: BatchCategory.KIDS,
            branchName: null,
            danceStyles: null,
            frequency: "WEEKLY",
            weekdays: [1],
            startTime: "16:00",
            endTime: "17:00",
            startDate: "2024-06-03",
            endDate: "2025-03-31",
            utcOffsetMinutes: 0,
            capacity: 12,
            enrollmentMode: "STAFF_ONLY",
            active: true,
          },
          {
            name: "Adults",
            category: BatchCategory.ADULTS,
            branchName: null,
            danceStyles: null,
            frequency: "WEEKLY",
            weekdays: [2],
            startTime: "18:00",
            endTime: "19:00",
            startDate: "2024-06-03",
            endDate: "2025-03-31",
            utcOffsetMinutes: 0,
            capacity: 10,
            enrollmentMode: "STAFF_ONLY",
            active: true,
          },
        ],
        enrollments: [],
        invoices: [],
      }),
    ).rejects.toThrow("Import one batch at a time");
  });

  it("creates a Main Branch when the studio has none", async () => {
    const { service, prisma } = buildService({
      prisma: {
        studioBranch: {
          findMany: vi.fn().mockResolvedValue([]),
          create: vi.fn().mockResolvedValue({ id: "branch-new" }),
        },
      },
    });

    await service.importStudioData(ACTOR, {
      students: [],
      batches: [
        {
          name: "Kids Hip-Hop",
          category: BatchCategory.KIDS,
          branchName: null,
          danceStyles: null,
          frequency: "WEEKLY",
          weekdays: [],
          startTime: "09:00",
          endTime: "10:00",
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          utcOffsetMinutes: null,
          capacity: 10,
          enrollmentMode: "STAFF_ONLY",
          active: true,
        },
      ],
      enrollments: [],
      invoices: [],
    });

    expect(prisma.studioBranch.create).toHaveBeenCalledWith({
      data: { studioId: "studio-1", name: "Main Branch", address: "" },
      select: { id: true },
    });
    expect(prisma.batch.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ branchId: "branch-new" })],
    });
  });

  it("links enrollments by email and batch name, skipping unresolved rows", async () => {
    const { service, prisma, projections } = buildService({
      prisma: {
        user: {
          findMany: vi
            .fn()
            .mockResolvedValue([
              { id: "student-1", emailHash: "hash:ada@example.com" },
            ]),
        },
        batch: {
          findMany: vi
            .fn()
            .mockResolvedValue([{ id: "batch-1", name: "Kids Hip-Hop" }]),
        },
      },
    });

    const result = await service.importStudioData(ACTOR, {
      students: [],
      batches: [],
      enrollments: [
        {
          studentEmail: "ada@example.com",
          batchName: "kids hip-hop",
          enrolledAt: "2024-06-03",
          status: BatchEnrollmentStatus.ACTIVE,
          endedAt: null,
          endReason: null,
        },
        {
          studentEmail: "unknown@example.com",
          batchName: "Kids Hip-Hop",
          enrolledAt: "2024-06-03",
          status: BatchEnrollmentStatus.ACTIVE,
          endedAt: null,
          endReason: null,
        },
        {
          studentEmail: "ada@example.com",
          batchName: "Kids Hip-Hop",
          enrolledAt: "2024-06-03",
          status: BatchEnrollmentStatus.ENDED,
          endedAt: null,
          endReason: "no end date",
        },
      ],
      invoices: [],
    });

    expect(result.enrollments).toEqual({ created: 1, skipped: 2 });
    expect(prisma.batchEnrollment.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          batchId: "batch-1",
          studentId: "student-1",
          enrolledAt: new Date("2024-06-03T12:00:00.000Z"),
          status: BatchEnrollmentStatus.ACTIVE,
        }),
      ],
    });
    expect(projections.refreshBatchSummary).toHaveBeenCalledWith("batch-1");
  });

  it("creates historical invoices and refreshes revenue for paid months", async () => {
    const { service, prisma, projections } = buildService({
      prisma: {
        user: {
          findMany: vi
            .fn()
            .mockResolvedValue([
              { id: "student-1", emailHash: "hash:ada@example.com" },
            ]),
        },
        studioSettings: {
          findUnique: vi.fn().mockResolvedValue({
            timezone: "UTC",
            platformFeePercent: 3,
            gstPercent: 0,
          }),
        },
      },
    });

    const result = await service.importStudioData(ACTOR, {
      students: [],
      batches: [],
      enrollments: [],
      invoices: [
        {
          studentEmail: "ada@example.com",
          batchName: null,
          amount: 1500,
          status: InvoiceStatus.PAID,
          paymentMethod: "CASH",
          paidAt: "2024-06-03",
          referralDiscount: 100,
          studioDiscount: 0,
          refundedAmount: 0,
          refundedAt: null,
        },
        {
          studentEmail: "ada@example.com",
          batchName: null,
          amount: 1800,
          status: InvoiceStatus.REFUNDED,
          paymentMethod: "UPI_MANUAL",
          paidAt: "2024-07-01",
          referralDiscount: 0,
          studioDiscount: 0,
          refundedAmount: undefined,
          refundedAt: "2024-07-10",
        },
        {
          studentEmail: "ada@example.com",
          batchName: null,
          amount: 500,
          status: InvoiceStatus.PAID,
          paymentMethod: "CASH",
          paidAt: null,
          referralDiscount: 0,
          studioDiscount: 0,
          refundedAmount: 0,
          refundedAt: null,
        },
        {
          studentEmail: "unknown@example.com",
          batchName: null,
          amount: 900,
          status: InvoiceStatus.PAID,
          paymentMethod: "CASH",
          paidAt: "2024-08-01",
          referralDiscount: 0,
          studioDiscount: 0,
          refundedAmount: 0,
          refundedAt: null,
        },
      ],
    });

    expect(result.invoices).toEqual({
      created: 2,
      skipped: 2,
      gapsCreated: 0,
    });
    const createdInvoices = prisma.invoice.createMany.mock.calls[0]![0]!
      .data as Array<Record<string, unknown>>;
    expect(createdInvoices).toHaveLength(2);
    expect(createdInvoices[0]).toMatchObject({
      studentId: "student-1",
      amount: 1500,
      status: InvoiceStatus.PAID,
      paymentMethod: "CASH",
      paidAt: new Date("2024-06-03T12:00:00.000Z"),
      referralDiscount: 100,
      platformFeePercent: 3,
    });
    expect(createdInvoices[1]).toMatchObject({
      amount: 1800,
      status: InvoiceStatus.REFUNDED,
      refundedAmount: 1800,
      refundedAt: new Date("2024-07-10T12:00:00.000Z"),
    });
    const periods = projections.refreshStudioRevenue.mock.calls.map(
      (call) => call[1],
    );
    expect(periods).toEqual(expect.arrayContaining(["2024-06", "2024-07"]));
    expect(periods).not.toContain("2024-08");
  });

  it("passes students through to createStudents", async () => {
    const { service, users } = buildService();
    await service.importStudioData(ACTOR, {
      students: STUDENTS,
      batches: [],
      enrollments: [],
      invoices: [],
      attendance: [],
    });
    expect(users.createStudents).toHaveBeenCalledWith("studio-1", [
      expect.objectContaining({ name: "Ada Lovelace", gender: "FEMALE" }),
    ]);
  });

  it("links attendance to existing sessions and skips rows without start time or session", async () => {
    const { service, prisma } = buildService({
      prisma: {
        user: {
          findMany: vi.fn().mockResolvedValue([
            { id: "student-1", emailHash: "hash:ada@example.com" },
            { id: "student-2", emailHash: "hash:alan@example.com" },
          ]),
        },
        batch: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "batch-1",
              name: "Kids Hip-Hop",
              scheduleJson: { startTime: "16:00" },
            },
          ]),
        },
        session: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "session-1",
              batchId: "batch-1",
              startsAt: new Date("2024-06-03T16:00:00.000Z"),
            },
          ]),
          createMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
      },
    });

    const result = await service.importStudioData(ACTOR, {
      students: [],
      batches: [],
      enrollments: [],
      invoices: [],
      attendance: [
        {
          batchName: "Kids Hip-Hop",
          studentEmail: "ada@example.com",
          date: "2024-06-03",
          startTime: "16:00",
          status: "PRESENT",
        },
        {
          batchName: "kids hip-hop",
          studentEmail: "alan@example.com",
          date: "2024-06-03",
          startTime: "16:00",
          status: "ABSENT",
        },
        {
          batchName: "Kids Hip-Hop",
          studentEmail: "unknown@example.com",
          date: "2024-06-03",
          startTime: "16:00",
          status: "PRESENT",
        },
        {
          batchName: "Kids Hip-Hop",
          studentEmail: "ada@example.com",
          date: "2024-06-03",
          startTime: "16:00",
          status: "PRESENT",
        },
        {
          batchName: "Kids Hip-Hop",
          studentEmail: "ada@example.com",
          date: "2024-06-04",
          startTime: "16:00",
          status: "PRESENT",
        },
        {
          batchName: "Kids Hip-Hop",
          studentEmail: "alan@example.com",
          date: "2024-06-03",
          status: "ABSENT",
        },
      ],
    });

    expect(result.attendance).toEqual({ created: 2, skipped: 4 });
    expect(prisma.session.createMany).not.toHaveBeenCalled();
    expect(prisma.attendance.createMany).toHaveBeenCalledWith({
      data: [
        {
          sessionId: "session-1",
          studentId: "student-1",
          status: "PRESENT",
          markedById: "user-owner-1",
          source: "DESK",
        },
        {
          sessionId: "session-1",
          studentId: "student-2",
          status: "ABSENT",
          markedById: "user-owner-1",
          source: "DESK",
        },
      ],
    });
  });

  it("creates locations with dedupe and normalized amenities", async () => {
    const { service, prisma } = buildService({
      prisma: {
        studioBranch: {
          findMany: vi
            .fn()
            .mockResolvedValue([{ id: "branch-main", name: "Main Branch" }]),
          createMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      },
    });

    const result = await service.importStudioData(ACTOR, {
      students: [],
      locations: [
        {
          name: "West Studio",
          address: "  MG Road, Bengaluru  ",
          latitude: 12.9716,
          longitude: 77.5946,
          description: "Flagship",
          amenities: [" Parking", "Changing rooms", "Wifi "],
          openingHours: { days: [{ day: 1, open: "09:00", close: "18:00" }] },
          pricingBlurb: null,
        },
        {
          name: "Main Branch",
          address: null,
          latitude: null,
          longitude: null,
          description: null,
          amenities: null,
          openingHours: null,
          pricingBlurb: null,
        },
        {
          name: "",
          address: null,
          latitude: null,
          longitude: null,
          description: null,
          amenities: null,
          openingHours: null,
          pricingBlurb: null,
        },
      ],
      batches: [],
      enrollments: [],
      invoices: [],
      attendance: [],
    });

    expect(result.locations).toEqual({ created: 1, skipped: 2 });
    expect(prisma.studioBranch.createMany).toHaveBeenCalledWith({
      data: [
        {
          studioId: "studio-1",
          name: "West Studio",
          address: "MG Road, Bengaluru",
          latitude: 12.9716,
          longitude: 77.5946,
          description: "Flagship",
          amenities: ["Parking", "Changing rooms", "Wifi"],
          openingHours: {
            days: [{ day: 1, open: "09:00", close: "18:00" }],
          },
          pricingBlurb: null,
        },
      ],
    });
  });

  it("links batch rows to locations imported in the same file", async () => {
    const { service, prisma } = buildService({
      prisma: {
        studioBranch: {
          findMany: vi
            .fn()
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([
              { id: "branch-main", name: "Main Branch" },
            ]),
          createMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        batch: {
          findMany: vi.fn().mockResolvedValue([]),
          createMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      },
    });

    const result = await service.importStudioData(ACTOR, {
      students: [],
      locations: [
        {
          name: "Main Branch",
          address: "MG Road, Bengaluru",
          latitude: null,
          longitude: null,
          description: null,
          amenities: null,
          openingHours: null,
          pricingBlurb: null,
        },
      ],
      batches: [
        {
          name: "Kids Hip-Hop",
          category: BatchCategory.KIDS,
          branchName: "Main Branch",
          danceStyles: null,
          frequency: "WEEKLY",
          weekdays: [],
          startTime: "09:00",
          endTime: "10:00",
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          utcOffsetMinutes: null,
          capacity: 10,
          enrollmentMode: "STAFF_ONLY",
          active: true,
        },
      ],
      enrollments: [],
      invoices: [],
      attendance: [],
    });

    expect(result.locations).toEqual({ created: 1, skipped: 0 });
    expect(result.batches).toEqual({ created: 1, skipped: 0 });
    expect(prisma.batch.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ branchId: "branch-main" })],
    });
  });

  it("reuses an existing session instead of creating a duplicate", async () => {
    const { service, prisma } = buildService({
      prisma: {
        user: {
          findMany: vi
            .fn()
            .mockResolvedValue([
              { id: "student-1", emailHash: "hash:ada@example.com" },
            ]),
        },
        batch: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "batch-1",
              name: "Kids Hip-Hop",
              scheduleJson: null,
            },
          ]),
        },
        session: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "session-9",
              batchId: "batch-1",
              startsAt: new Date("2024-06-03T09:00:00.000Z"),
            },
          ]),
          createMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
        attendance: {
          findMany: vi
            .fn()
            .mockResolvedValue([
              { sessionId: "session-9", studentId: "student-1" },
            ]),
          createMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
      },
    });

    const result = await service.importStudioData(ACTOR, {
      students: [],
      batches: [],
      enrollments: [],
      invoices: [],
      attendance: [
        {
          batchName: "Kids Hip-Hop",
          studentEmail: "ada@example.com",
          date: "2024-06-03",
          startTime: "09:00",
          status: "PRESENT",
        },
      ],
    });

    expect(result.attendance).toEqual({ created: 0, skipped: 1 });
    expect(prisma.session.createMany).not.toHaveBeenCalled();
    expect(prisma.attendance.createMany).not.toHaveBeenCalled();
  });

  it("creates sessions with trainers, defaulting end times and skipping unresolved rows", async () => {
    const { service, prisma } = buildService({
      prisma: {
        user: {
          findMany: vi
            .fn()
            .mockResolvedValue([
              { id: "trainer-1", emailHash: "hash:trainer@example.com" },
            ]),
        },
        batch: {
          findMany: vi
            .fn()
            .mockResolvedValue([{ id: "batch-1", name: "Kids Hip-Hop" }]),
        },
        session: {
          findMany: vi.fn().mockResolvedValue([]),
          createMany: vi.fn().mockResolvedValue({ count: 2 }),
        },
      },
    });

    const result = await service.importStudioData(ACTOR, {
      students: [],
      batches: [],
      enrollments: [],
      invoices: [],
      sessions: [
        {
          batchName: "Kids Hip-Hop",
          date: "2024-06-03",
          startTime: "16:00",
          endTime: "17:00",
          status: "COMPLETED",
          type: "REGULAR",
          trainerEmail: "trainer@example.com",
        },
        {
          batchName: "kids hip-hop",
          date: "2024-06-04",
          startTime: "18:00",
          status: "SCHEDULED",
          type: "TRIAL",
          trainerEmail: null,
        },
        {
          batchName: "Kids Hip-Hop",
          date: "2024-06-03",
          startTime: "16:00",
          status: "COMPLETED",
          type: "REGULAR",
          trainerEmail: "ghost@example.com",
        },
        {
          batchName: "Kids Hip-Hop",
          date: "2024-06-05",
          startTime: "21:00",
          endTime: "20:00",
          status: "COMPLETED",
          type: "REGULAR",
          trainerEmail: null,
        },
        {
          batchName: "Kids Hip-Hop",
          date: "2024-06-03",
          startTime: "16:00",
          endTime: "17:00",
          status: "COMPLETED",
          type: "REGULAR",
          trainerEmail: null,
        },
      ],
    });

    expect(result.sessions).toEqual({ created: 2, skipped: 3 });
    expect(prisma.session.createMany).toHaveBeenCalledWith({
      data: [
        {
          batchId: "batch-1",
          startsAt: new Date("2024-06-03T16:00:00.000Z"),
          endsAt: new Date("2024-06-03T17:00:00.000Z"),
          status: "COMPLETED",
          type: "REGULAR",
          trainerId: "trainer-1",
        },
        {
          batchId: "batch-1",
          startsAt: new Date("2024-06-04T18:00:00.000Z"),
          endsAt: new Date("2024-06-04T19:00:00.000Z"),
          status: "SCHEDULED",
          type: "TRIAL",
          trainerId: null,
        },
      ],
    });
  });

  it("links attendance rows to sessions imported in the same file", async () => {
    const { service, prisma } = buildService({
      prisma: {
        user: {
          findMany: vi.fn().mockResolvedValue([
            { id: "student-1", emailHash: "hash:ada@example.com" },
            { id: "student-2", emailHash: "hash:alan@example.com" },
          ]),
        },
        batch: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "batch-1",
              name: "Kids Hip-Hop",
              scheduleJson: { startTime: "16:00" },
            },
          ]),
        },
        session: {
          findMany: vi
            .fn()
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([
              {
                id: "session-1",
                batchId: "batch-1",
                startsAt: new Date("2024-06-03T16:00:00.000Z"),
              },
            ]),
          createMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        attendance: {
          findMany: vi.fn().mockResolvedValue([]),
          createMany: vi.fn().mockResolvedValue({ count: 2 }),
        },
      },
    });

    const result = await service.importStudioData(ACTOR, {
      students: [],
      batches: [],
      enrollments: [],
      invoices: [],
      sessions: [
        {
          batchName: "Kids Hip-Hop",
          date: "2024-06-03",
          startTime: "16:00",
          endTime: "17:00",
          status: "COMPLETED",
          type: "REGULAR",
          trainerEmail: null,
        },
      ],
      attendance: [
        {
          batchName: "Kids Hip-Hop",
          studentEmail: "ada@example.com",
          date: "2024-06-03",
          startTime: "16:00",
          status: "PRESENT",
        },
        {
          batchName: "Kids Hip-Hop",
          studentEmail: "alan@example.com",
          date: "2024-06-03",
          startTime: "16:00",
          status: "ABSENT",
        },
      ],
    });

    expect(result.sessions).toEqual({ created: 1, skipped: 0 });
    expect(result.attendance).toEqual({ created: 2, skipped: 0 });
    expect(prisma.session.createMany).toHaveBeenCalledTimes(1);
    expect(prisma.attendance.createMany).toHaveBeenCalledWith({
      data: [
        {
          sessionId: "session-1",
          studentId: "student-1",
          status: "PRESENT",
          markedById: "user-owner-1",
          source: "DESK",
        },
        {
          sessionId: "session-1",
          studentId: "student-2",
          status: "ABSENT",
          markedById: "user-owner-1",
          source: "DESK",
        },
      ],
    });
  });

  it("stores purchaseMeta.batchId when invoice batchName resolves", async () => {
    const { service, prisma } = buildService({
      prisma: {
        user: {
          findMany: vi
            .fn()
            .mockResolvedValue([
              { id: "student-1", emailHash: "hash:ada@example.com" },
            ]),
        },
        batch: {
          findMany: vi
            .fn()
            .mockResolvedValue([{ id: "batch-1", name: "Kids Hip-Hop" }]),
        },
      },
    });

    await service.importStudioData(ACTOR, {
      students: [],
      batches: [],
      enrollments: [],
      invoices: [
        {
          studentEmail: "ada@example.com",
          batchName: "Kids Hip-Hop",
          amount: 1500,
          status: InvoiceStatus.PAID,
          paymentMethod: "CASH",
          paidAt: "2024-06-03",
          referralDiscount: 0,
          studioDiscount: 0,
          refundedAmount: 0,
          refundedAt: null,
        },
      ],
    });

    expect(prisma.invoice.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          studentId: "student-1",
          membershipId: null,
          purchaseMeta: { batchId: "batch-1" },
        }),
      ],
    });
  });

  it("links imported invoices to an active membership for student+batch", async () => {
    const { service, prisma } = buildService({
      prisma: {
        user: {
          findMany: vi
            .fn()
            .mockResolvedValue([
              { id: "student-1", emailHash: "hash:ada@example.com" },
            ]),
        },
        batch: {
          findMany: vi
            .fn()
            .mockResolvedValue([
              { id: "batch-1", name: "Kids Hip-Hop", category: "KIDS" },
            ]),
        },
        subscription: {
          findMany: vi.fn().mockResolvedValue([
            { id: "sub-quarterly", name: "Kids Quarterly" },
          ]),
        },
        membership: {
          findFirst: vi.fn().mockResolvedValue(null),
          findMany: vi.fn().mockResolvedValue([
            {
              id: "mem-1",
              purchaserUserId: "student-1",
              batchId: "batch-1",
              subscriptionId: "sub-quarterly",
            },
          ]),
          create: vi.fn().mockResolvedValue({ id: "mem-1" }),
        },
      },
    });

    await service.importStudioData(ACTOR, {
      students: [],
      batches: [],
      enrollments: [],
      invoices: [
        {
          studentEmail: "ada@example.com",
          batchName: "Kids Hip-Hop",
          amount: 5000,
          status: InvoiceStatus.PAID,
          paymentMethod: "UPI_MANUAL",
          paidAt: "2026-06-01",
          referralDiscount: 0,
          studioDiscount: 0,
          refundedAmount: 0,
          refundedAt: null,
          planName: "Kids Quarterly",
        },
      ],
    });

    expect(prisma.invoice.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          studentId: "student-1",
          membershipId: "mem-1",
          purchaseMeta: {
            batchId: "batch-1",
            subscriptionId: "sub-quarterly",
            purchaserUserId: "student-1",
            coveredStudents: [
              {
                studentId: "student-1",
                seatRole: "KID",
                batchId: "batch-1",
              },
            ],
          },
        }),
      ],
    });
  });

  it("creates OVERDUE gap invoices for uncovered monthly enrollment periods", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-20T12:00:00.000Z"));

    const invoiceCreateMany = vi.fn().mockResolvedValue({ count: 0 });
    const { service, prisma } = buildService({
      prisma: {
        user: {
          findMany: vi
            .fn()
            .mockResolvedValue([
              { id: "student-1", emailHash: "hash:zeff@example.com" },
            ]),
        },
        batch: {
          findMany: vi.fn().mockResolvedValue([
            { id: "batch-1", name: "CB1", category: "KIDS" },
          ]),
        },
        batchPlan: {
          findMany: vi.fn().mockResolvedValue([
            { batchId: "batch-1", subscriptionId: "sub-m" },
          ]),
          createMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
        subscription: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "sub-m",
              name: "Kids Monthly",
              billingCadence: "MONTHLY",
              price: 2000,
            },
          ]),
        },
        membership: {
          findFirst: vi.fn().mockResolvedValue(null),
          findMany: vi.fn().mockResolvedValue([
            {
              id: "mem-1",
              purchaserUserId: "student-1",
              batchId: "batch-1",
              subscriptionId: "sub-m",
            },
          ]),
          create: vi.fn().mockResolvedValue({ id: "mem-1" }),
        },
        invoice: {
          createMany: invoiceCreateMany,
          findMany: vi.fn().mockResolvedValue([
            {
              studentId: "student-1",
              status: InvoiceStatus.PAID,
              paidAt: new Date("2026-08-01T12:00:00.000Z"),
              purchaseMeta: {
                batchId: "batch-1",
                subscriptionId: "sub-m",
              },
              membershipId: "mem-1",
            },
          ]),
        },
      },
    });

    const result = await service.importStudioData(ACTOR, {
      students: [],
      batches: [],
      enrollments: [
        {
          studentEmail: "zeff@example.com",
          batchName: "CB1",
          enrolledAt: "2026-06-05",
          status: BatchEnrollmentStatus.ACTIVE,
          endedAt: null,
          endReason: null,
          planName: "Kids Monthly",
        },
      ],
      invoices: [],
    });

    expect(result.invoices.gapsCreated).toBe(2);
    const gapCall = invoiceCreateMany.mock.calls.find((call) => {
      const data = call[0]?.data as Array<Record<string, unknown>>;
      return Array.isArray(data) && data.some((row) => row.status === "OVERDUE");
    });
    expect(gapCall).toBeTruthy();
    const gapData = gapCall![0]!.data as Array<Record<string, unknown>>;
    expect(gapData).toHaveLength(2);
    expect(gapData.map((row) => row.status)).toEqual(["OVERDUE", "OVERDUE"]);
    expect(gapData[0]).toMatchObject({
      studentId: "student-1",
      amount: 2000,
      membershipId: "mem-1",
      purchaseMeta: expect.objectContaining({
        batchId: "batch-1",
        subscriptionId: "sub-m",
        periodStart: "2026-06-01T00:00:00.000Z",
      }),
    });
    expect(prisma.batchEnrollment.createMany).toHaveBeenCalled();

    vi.useRealTimers();
  });

  it("does not create monthly gaps inside a quarterly paid window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-20T12:00:00.000Z"));

    const invoiceCreateMany = vi.fn().mockResolvedValue({ count: 0 });
    const { service } = buildService({
      prisma: {
        user: {
          findMany: vi
            .fn()
            .mockResolvedValue([
              { id: "student-1", emailHash: "hash:kid@example.com" },
            ]),
        },
        batch: {
          findMany: vi.fn().mockResolvedValue([
            { id: "batch-1", name: "CB1", category: "KIDS" },
          ]),
        },
        batchPlan: {
          findMany: vi.fn().mockResolvedValue([
            { batchId: "batch-1", subscriptionId: "sub-q" },
          ]),
          createMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
        subscription: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "sub-q",
              name: "Kids Quarterly",
              billingCadence: "QUARTERLY",
              price: 5000,
            },
          ]),
        },
        membership: {
          findFirst: vi.fn().mockResolvedValue(null),
          findMany: vi.fn().mockResolvedValue([]),
          create: vi.fn().mockResolvedValue({ id: "mem-1" }),
        },
        invoice: {
          createMany: invoiceCreateMany,
          findMany: vi.fn().mockResolvedValue([
            {
              studentId: "student-1",
              status: InvoiceStatus.PAID,
              paidAt: new Date("2026-06-01T12:00:00.000Z"),
              purchaseMeta: {
                batchId: "batch-1",
                subscriptionId: "sub-q",
              },
              membershipId: null,
            },
          ]),
        },
      },
    });

    const result = await service.importStudioData(ACTOR, {
      students: [],
      batches: [],
      enrollments: [
        {
          studentEmail: "kid@example.com",
          batchName: "CB1",
          enrolledAt: "2026-06-05",
          status: BatchEnrollmentStatus.ACTIVE,
          endedAt: null,
          endReason: null,
          planName: "Kids Quarterly",
        },
      ],
      invoices: [],
    });

    expect(result.invoices.gapsCreated).toBe(0);
    const overdueCalls = invoiceCreateMany.mock.calls.filter((call) => {
      const data = call[0]?.data as Array<Record<string, unknown>>;
      return Array.isArray(data) && data.some((row) => row.status === "OVERDUE");
    });
    expect(overdueCalls).toHaveLength(0);

    vi.useRealTimers();
  });

  it("converts session local times using the studio timezone", async () => {
    const { service, prisma } = buildService({
      prisma: {
        studioSettings: {
          findUnique: vi.fn().mockResolvedValue({
            timezone: "Asia/Kolkata",
            platformFeePercent: 5,
            gstPercent: 0,
          }),
        },
        batch: {
          findMany: vi
            .fn()
            .mockResolvedValue([{ id: "batch-1", name: "Kids Hip-Hop" }]),
        },
        session: {
          findMany: vi.fn().mockResolvedValue([]),
          createMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      },
    });

    await service.importStudioData(ACTOR, {
      students: [],
      batches: [],
      enrollments: [],
      invoices: [],
      sessions: [
        {
          batchName: "Kids Hip-Hop",
          date: "2024-06-03",
          startTime: "16:00",
          endTime: "17:00",
          status: "COMPLETED",
          type: "REGULAR",
          trainerEmail: null,
        },
      ],
    });

    expect(prisma.session.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          batchId: "batch-1",
          startsAt: new Date("2024-06-03T10:30:00.000Z"),
          endsAt: new Date("2024-06-03T11:30:00.000Z"),
        }),
      ],
    });
  });

  it("attaches monthly and quarterly plans when batch plan names are provided", async () => {
    const { service, prisma } = buildService({
      prisma: {
        studioBranch: {
          findMany: vi
            .fn()
            .mockResolvedValue([{ id: "branch-main", name: "Main Branch" }]),
        },
        batch: {
          findMany: vi.fn().mockResolvedValue([]),
          createMany: vi.fn().mockResolvedValue({ count: 1 }),
          findFirst: vi.fn().mockResolvedValue({
            id: "batch-1",
            category: BatchCategory.KIDS,
          }),
        },
        subscription: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "sub-month",
              name: "Kids Monthly",
              billingCadence: "MONTHLY",
            },
            {
              id: "sub-quarter",
              name: "Kids Quarterly",
              billingCadence: "QUARTERLY",
            },
          ]),
        },
        batchPlan: {
          createMany: vi.fn().mockResolvedValue({ count: 2 }),
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
    });

    // After createMany, refresh looks up created batches by name
    prisma.batch.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "batch-1", name: "Kids Hip-Hop" }]);

    await service.importStudioData(ACTOR, {
      students: [],
      batches: [
        {
          name: "Kids Hip-Hop",
          category: BatchCategory.KIDS,
          branchName: "Main Branch",
          danceStyles: null,
          frequency: "WEEKLY",
          weekdays: [1],
          startTime: "16:00",
          endTime: "17:00",
          startDate: "2024-06-03",
          endDate: "2025-03-31",
          utcOffsetMinutes: 0,
          capacity: 12,
          enrollmentMode: "STAFF_ONLY",
          active: true,
          monthlyPlanName: "Kids Monthly",
          quarterlyPlanName: "Kids Quarterly",
        },
      ],
      enrollments: [],
      invoices: [],
    });

    expect(prisma.batchPlan.createMany).toHaveBeenCalledWith({
      data: [
        { batchId: "batch-1", subscriptionId: "sub-month" },
        { batchId: "batch-1", subscriptionId: "sub-quarter" },
      ],
      skipDuplicates: true,
    });
  });

  it("creates a membership when an enrollment includes a plan name", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T12:00:00.000Z"));

    const { service, prisma } = buildService({
      prisma: {
        user: {
          findMany: vi
            .fn()
            .mockResolvedValue([
              { id: "student-1", emailHash: "hash:ada@example.com" },
            ]),
        },
        batch: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "batch-1",
              name: "Kids Hip-Hop",
              category: BatchCategory.KIDS,
            },
          ]),
        },
        subscription: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "sub-month",
              name: "Kids Monthly",
              billingCadence: "MONTHLY",
              price: 2000,
            },
          ]),
        },
        batchPlan: {
          findMany: vi
            .fn()
            .mockResolvedValue([
              { batchId: "batch-1", subscriptionId: "sub-month" },
            ]),
          createMany: vi.fn(),
        },
        batchEnrollment: {
          findMany: vi.fn().mockResolvedValue([]),
          createMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        membership: {
          findFirst: vi.fn().mockResolvedValue(null),
          findMany: vi.fn().mockResolvedValue([]),
          create: vi.fn().mockResolvedValue({ id: "mem-1" }),
        },
      },
    });

    const result = await service.importStudioData(ACTOR, {
      students: [],
      batches: [],
      enrollments: [
        {
          studentEmail: "ada@example.com",
          batchName: "Kids Hip-Hop",
          enrolledAt: "2024-06-03",
          status: BatchEnrollmentStatus.ACTIVE,
          endedAt: null,
          endReason: null,
          planName: "Kids Monthly",
        },
      ],
      invoices: [],
    });

    expect(result.enrollments).toEqual({ created: 1, skipped: 0 });
    expect(prisma.membership.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subscriptionId: "sub-month",
          purchaserUserId: "student-1",
          batchId: "batch-1",
        }),
      }),
    );
    // Current month uncovered → one PENDING gap at catalog price.
    expect(result.invoices.gapsCreated).toBe(1);

    vi.useRealTimers();
  });
});
