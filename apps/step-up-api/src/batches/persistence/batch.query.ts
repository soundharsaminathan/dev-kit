import { Inject, Injectable } from "@nestjs/common";
import { BatchEnrollmentStatus, type Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { userPiiSelect } from "../../users/user-crypto.service";
import { resolvePageLimit } from "../../shared/pagination";
import type { DiscoverBatchFilters } from "../batches.service";
import { ACTIVE_ENROLLMENT_WHERE } from "../enrollment-status";

const trainerLiteSelect = {
  id: true,
  photoUrl: true,
  ...userPiiSelect,
} as const;

const subscriptionSlimSelect = {
  id: true,
  name: true,
  kind: true,
  individualAudience: true,
  familyPack: true,
  billingCadence: true,
  adultSeats: true,
  kidSeats: true,
  price: true,
  active: true,
} as const;

const branchCoverSelect = {
  id: true,
  name: true,
  address: true,
  coverMedia: { select: { objectKey: true } },
  media: {
    where: { archivedAt: null },
    orderBy: { sortOrder: "asc" as const },
    take: 1,
    select: { objectKey: true },
  },
} as const;

const discoverCardSelect = {
  id: true,
  studioId: true,
  name: true,
  category: true,
  branchId: true,
  scheduleJson: true,
  danceCategories: true,
  capacity: true,
  active: true,
  coverImageUrl: true,
  ratingAvg: true,
  ratingCount: true,
  enrollmentMode: true,
  summary: {
    select: {
      capacity: true,
      enrolled: true,
      reserved: true,
      availableSeats: true,
      trainerCount: true,
      active: true,
    },
  },
  trainers: {
    select: {
      trainerId: true,
      trainer: { select: trainerLiteSelect },
    },
  },
  plans: {
    select: {
      subscription: { select: subscriptionSlimSelect },
    },
  },
  branch: { select: branchCoverSelect },
  _count: {
    select: { enrollments: { where: ACTIVE_ENROLLMENT_WHERE } },
  },
} as const;

const studentLiteSelect = {
  id: true,
  photoUrl: true,
  styles: true,
  createdAt: true,
  ...userPiiSelect,
} as const;

@Injectable()
export class BatchQuery {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findDiscoverCards(
    studioId: string,
    filters: DiscoverBatchFilters,
    pagination: { cursor?: string; limit?: number },
  ) {
    const limit = resolvePageLimit(pagination.limit);
    const activeOnly = filters.activeOnly ?? false;

    const where: Prisma.BatchWhereInput = {
      studioId,
      ...(activeOnly ? { active: true } : {}),
      ...(filters.category
        ? { category: filters.category as "KIDS" | "ADULTS" }
        : {}),
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...(filters.trainerId
        ? { trainers: { some: { trainerId: filters.trainerId } } }
        : {}),
      ...(filters.search
        ? {
            name: {
              contains: filters.search,
              mode: "insensitive",
            },
          }
        : {}),
    };

    const rows = await this.prisma.batch.findMany({
      where,
      select: discoverCardSelect,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      ...(pagination.cursor
        ? { cursor: { id: pagination.cursor }, skip: 1 }
        : {}),
      take: limit + 1,
    });

    return { rows, limit };
  }

  async findHeader(id: string) {
    return this.prisma.batch.findUniqueOrThrow({
      where: { id },
      select: {
        ...discoverCardSelect,
        certificationEnabled: true,
        certificateTemplateId: true,
        certificateTemplate: true,
        sessions: {
          orderBy: { startsAt: "asc" },
          select: {
            id: true,
            startsAt: true,
            endsAt: true,
            status: true,
            type: true,
          },
        },
      },
    });
  }

  async findRoster(
    batchId: string,
    pagination: {
      cursor?: string;
      limit?: number;
      tab?: "active" | "inactive";
      searchAll?: boolean;
    },
  ) {
    const limit = resolvePageLimit(pagination.limit);
    const tab = pagination.tab ?? "active";
    const status =
      tab === "inactive"
        ? BatchEnrollmentStatus.ENDED
        : BatchEnrollmentStatus.ACTIVE;

    const rows = await this.prisma.batchEnrollment.findMany({
      where: { batchId, status },
      select: {
        id: true,
        batchId: true,
        studentId: true,
        enrolledAt: true,
        status: true,
        endedAt: true,
        endReason: true,
        student: { select: studentLiteSelect },
      },
      orderBy: [{ enrolledAt: "desc" }, { id: "asc" }],
      ...(pagination.searchAll
        ? {}
        : {
            ...(pagination.cursor
              ? { cursor: { id: pagination.cursor }, skip: 1 }
              : {}),
            take: limit + 1,
          }),
    });

    return { rows, limit, tab };
  }

  async findStudioId(batchId: string) {
    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
      select: { studioId: true, category: true },
    });
    return batch;
  }
}
