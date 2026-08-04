import { randomUUID } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  type AgeRange,
  AttendanceStatus,
  BookingStatus,
  BookingType,
  type ExperienceLevel,
  FamilyMemberKind,
  type Gender,
  ProfileVisibility,
  SessionStatus,
  UserRole,
} from "@prisma/client";
import { assertBatchHasSeat, lockBatchRow } from "../batches/batch-capacity";
import { MediaService } from "../media/media.service";
import { PrismaService } from "../prisma/prisma.service";
import { isAlwaysPublicRole } from "../social/visibility";
import {
  batchHasCompletedSession,
  batchHasScheduledSession,
  classifyStudentFunnelStage,
  countStudentFunnel,
  isDateInRange,
  resolveStudentFunnelPeriod,
  type StudentFunnelCounts,
  type StudentFunnelPeriod,
  type StudentFunnelStage,
} from "./student-funnel";
import {
  type DecryptedUser,
  type EncryptedUserFields,
  UserCryptoService,
  type UserPii,
  userPiiSelect,
} from "./user-crypto.service";

export const PERSONAL_TRIAL_NOTES =
  "Personal trial — studio will call to confirm a time";

export const PERSONAL_TRIAL_TIMED_NOTES =
  "Personal trial — preferred time requested";

@Injectable()
export class UsersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(UserCryptoService) private readonly crypto: UserCryptoService,
    @Inject(MediaService) private readonly media: MediaService,
  ) {}

  private async presentUser<
    T extends EncryptedUserFields & {
      photoUrl?: string | null;
      bannerUrl?: string | null;
      coverUrl?: string | null;
    },
  >(user: T) {
    const decrypted = this.crypto.decryptUser(user);
    return {
      ...decrypted,
      photoUrl: await this.media.signReadUrl(user.photoUrl ?? null),
      ...(user.bannerUrl !== undefined
        ? { bannerUrl: await this.media.signReadUrl(user.bannerUrl) }
        : {}),
      ...(user.coverUrl !== undefined
        ? { coverUrl: await this.media.signReadUrl(user.coverUrl) }
        : {}),
    };
  }

  async listByStudio(studioId: string) {
    const users = await this.prisma.user.findMany({
      where: { studioId },
      select: {
        id: true,
        ...userPiiSelect,
        role: true,
        photoUrl: true,
      },
    });

    return Promise.all(users.map((user) => this.presentUser(user))).then(
      (presented) => presented.sort((a, b) => a.name.localeCompare(b.name)),
    );
  }

  async listStudents(studioId: string, q?: string) {
    const users = await this.prisma.user.findMany({
      where: {
        studioId,
        role: UserRole.STUDENT,
        active: true,
      },
      select: {
        id: true,
        ...userPiiSelect,
        role: true,
        photoUrl: true,
        active: true,
      },
    });

    const presented = await Promise.all(
      users.map((user) => this.presentUser(user)),
    );
    presented.sort((a, b) => a.name.localeCompare(b.name));

    const query = q?.trim().toLowerCase();
    if (!query) {
      return presented.slice(0, 50);
    }

    return presented
      .filter((user) => {
        const haystack = [user.name, user.email, user.phone]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 50);
  }

  async createStudent(data: {
    studioId: string;
    name: string;
    email: string;
    gender: Gender;
    ageRange: AgeRange;
    phone?: string;
    styles?: string[];
    batchId?: string;
  }) {
    const student = await this.createStudioMember({
      studioId: data.studioId,
      name: data.name,
      email: data.email,
      gender: data.gender,
      ageRange: data.ageRange,
      phone: data.phone,
      styles: data.styles,
      role: UserRole.STUDENT,
    });

    if (data.batchId) {
      await this.enrollNewStudentInBatch(
        data.studioId,
        student.id,
        data.batchId,
      );
    }

    return student;
  }

  private async enrollNewStudentInBatch(
    studioId: string,
    studentId: string,
    batchId: string,
  ) {
    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
      select: {
        id: true,
        studioId: true,
        active: true,
        capacity: true,
      },
    });

    if (!batch || batch.studioId !== studioId) {
      throw new BadRequestException("Select a batch from this studio");
    }
    if (!batch.active) {
      throw new BadRequestException("Batch is not active");
    }

    await this.prisma.$transaction(async (tx) => {
      await lockBatchRow(tx, batchId);
      await assertBatchHasSeat(tx, batchId, batch.capacity, studentId);
      await tx.batchEnrollment.upsert({
        where: {
          batchId_studentId: { batchId, studentId },
        },
        update: {},
        create: {
          batchId,
          studentId,
        },
      });
    });
  }

  async createTrainer(data: {
    studioId: string;
    name: string;
    email: string;
    gender: Gender;
    ageRange: AgeRange;
    phone?: string;
    styles?: string[];
  }) {
    return this.createStudioMember({
      ...data,
      role: UserRole.TRAINER,
    });
  }

  private async createStudioMember(data: {
    studioId: string;
    name: string;
    email: string;
    gender: Gender;
    ageRange: AgeRange;
    phone?: string;
    role: typeof UserRole.STUDENT | typeof UserRole.TRAINER;
    styles?: string[];
  }) {
    const emailHash = this.crypto.hashEmail(data.email);
    const existing = await this.prisma.user.findFirst({
      where: {
        studioId: data.studioId,
        emailHash,
      },
    });

    if (existing) {
      throw new ConflictException("A user with this email already exists");
    }

    const sealed = this.crypto.sealPii({
      email: data.email,
      name: data.name,
      phone: data.phone ?? null,
      bio: null,
      instagramUrl: null,
    });

    const user = await this.prisma.user.create({
      data: {
        firebaseUid: `staff-created:${randomUUID()}`,
        ...sealed,
        role: data.role,
        studioId: data.studioId,
        gender: data.gender,
        ageRange: data.ageRange,
        styles: data.styles ?? [],
        profileVisibility: isAlwaysPublicRole(data.role)
          ? ProfileVisibility.PUBLIC
          : ProfileVisibility.PRIVATE,
      },
      select: {
        id: true,
        ...userPiiSelect,
        role: true,
      },
    });

    return this.presentUser(user);
  }

  async createStudents(
    studioId: string,
    students: Array<{ name: string; email: string; phone?: string }>,
  ) {
    const uniqueStudents = Array.from(
      new Map(
        students.map((student) => [
          student.email.trim().toLowerCase(),
          {
            name: student.name.trim(),
            email: student.email.trim().toLowerCase(),
            phone: student.phone?.trim() || undefined,
          },
        ]),
      ).values(),
    );
    const emailHashes = uniqueStudents.map((student) =>
      this.crypto.hashEmail(student.email),
    );
    const existing = await this.prisma.user.findMany({
      where: {
        studioId,
        emailHash: { in: emailHashes },
      },
      select: { emailHash: true },
    });
    const existingHashes = new Set(existing.map((row) => row.emailHash));
    const newStudents = uniqueStudents.filter(
      (student) => !existingHashes.has(this.crypto.hashEmail(student.email)),
    );

    if (newStudents.length > 0) {
      await this.prisma.user.createMany({
        data: newStudents.map((student) => ({
          firebaseUid: `staff-created:${randomUUID()}`,
          ...this.crypto.sealPii({
            email: student.email,
            name: student.name,
            phone: student.phone ?? null,
            bio: null,
            instagramUrl: null,
          }),
          role: UserRole.STUDENT,
          studioId,
          styles: [],
          profileVisibility: ProfileVisibility.PRIVATE,
        })),
      });
    }

    return {
      created: newStudents.length,
      skipped: students.length - newStudents.length,
    };
  }

  async getStudentStudioProfile(studioId: string, studentId: string) {
    const student = await this.prisma.user.findFirst({
      where: {
        id: studentId,
        studioId,
        role: UserRole.STUDENT,
      },
      select: {
        id: true,
        ...userPiiSelect,
        role: true,
        photoUrl: true,
        styles: true,
        active: true,
      },
    });

    if (!student) {
      throw new NotFoundException("Student not found in this studio");
    }

    const [enrollments, memberships, attendanceRecords, invoices, parentLinks] =
      await Promise.all([
        this.prisma.batchEnrollment.findMany({
          where: {
            studentId,
            batch: { studioId },
          },
          include: {
            batch: {
              select: {
                id: true,
                name: true,
                active: true,
                category: true,
              },
            },
          },
          orderBy: { batch: { name: "asc" } },
        }),
        this.prisma.membership.findMany({
          where: {
            OR: [
              { purchaserUserId: studentId },
              { coveredStudents: { some: { studentId } } },
            ],
            subscription: { studioId },
          },
          include: {
            subscription: true,
            coveredStudents: true,
          },
          orderBy: { periodStart: "desc" },
        }),
        this.prisma.attendance.findMany({
          where: {
            studentId,
            session: { batch: { studioId } },
          },
          select: { status: true },
        }),
        this.prisma.invoice.findMany({
          where: { studentId, studioId },
          orderBy: { id: "desc" },
          take: 20,
        }),
        this.prisma.parentChild.findMany({
          where: { childUserId: studentId },
          include: {
            parent: {
              select: {
                id: true,
                ...userPiiSelect,
                role: true,
                photoUrl: true,
                active: true,
              },
            },
          },
        }),
      ]);

    const attendance = {
      total: attendanceRecords.length,
      present: attendanceRecords.filter(
        (record) => record.status === AttendanceStatus.PRESENT,
      ).length,
      absent: attendanceRecords.filter(
        (record) => record.status === AttendanceStatus.ABSENT,
      ).length,
    };

    return {
      student: await this.presentUser(student),
      batches: enrollments.map((enrollment) => enrollment.batch),
      memberships,
      attendance,
      invoices: invoices.map((invoice) => ({
        ...invoice,
        amount: Number(invoice.amount),
      })),
      parents: await Promise.all(
        parentLinks.map(async (link) => this.presentUser(link.parent)),
      ),
    };
  }

  async updateStudioStudent(
    studioId: string,
    studentId: string,
    data: { name?: string; phone?: string; active?: boolean },
  ) {
    const student = await this.prisma.user.findFirst({
      where: {
        id: studentId,
        studioId,
        role: UserRole.STUDENT,
      },
    });

    if (!student) {
      throw new NotFoundException("Student not found in this studio");
    }

    if (
      data.name === undefined &&
      data.phone === undefined &&
      data.active === undefined
    ) {
      throw new BadRequestException("No student fields to update");
    }

    if (data.name !== undefined || data.phone !== undefined) {
      await this.updateProfile(studentId, UserRole.STUDENT, {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
      });
    }

    if (data.active !== undefined) {
      await this.prisma.user.update({
        where: { id: studentId },
        data: { active: data.active },
      });
    }

    return this.getStudentStudioProfile(studioId, studentId);
  }

  async deleteStudent(studioId: string, studentId: string) {
    const student = await this.prisma.user.findFirst({
      where: {
        id: studentId,
        studioId,
        role: UserRole.STUDENT,
      },
      select: { id: true },
    });

    if (!student) {
      throw new NotFoundException("Student not found in this studio");
    }

    const markedAttendance = await this.prisma.attendance.count({
      where: { markedById: studentId },
    });
    if (markedAttendance > 0) {
      throw new ConflictException(
        "Cannot delete a student who has marked attendance records",
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.contestEntry.deleteMany({
        where: { registeredById: studentId },
      });
      await tx.user.delete({ where: { id: studentId } });
    });

    return { deleted: true, id: studentId };
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id },
      include: {
        parentLinks: { include: { child: true } },
        childLinks: { include: { parent: true } },
      },
    });

    return {
      ...(await this.presentUser(user)),
      parentLinks: await Promise.all(
        user.parentLinks.map(async (link) => ({
          ...link,
          child: await this.presentUser(link.child),
        })),
      ),
      childLinks: await Promise.all(
        user.childLinks.map(async (link) => ({
          ...link,
          parent: await this.presentUser(link.parent),
        })),
      ),
    };
  }

  async updateProfile(
    id: string,
    role: UserRole,
    data: {
      name?: string;
      phone?: string;
      bio?: string;
      photoUrl?: string;
      bannerUrl?: string;
      coverUrl?: string;
      instagramUrl?: string;
      styles?: string[];
      experienceLevel?: ExperienceLevel;
      scheduleVibe?: string[];
      gender?: Gender;
      ageRange?: AgeRange;
      preferredBranchId?: string | null;
      profileVisibility?: ProfileVisibility;
    },
  ) {
    const existing = await this.prisma.user.findUniqueOrThrow({
      where: { id },
    });
    const current = this.crypto.decryptUser(existing);

    if (data.preferredBranchId) {
      const branch = await this.prisma.studioBranch.findFirst({
        where: {
          id: data.preferredBranchId,
          ...(existing.studioId ? { studioId: existing.studioId } : {}),
        },
        select: { id: true },
      });
      if (!branch) {
        throw new BadRequestException("Preferred branch was not found");
      }
    }

    const piiChanged =
      data.name !== undefined ||
      data.phone !== undefined ||
      data.bio !== undefined ||
      data.instagramUrl !== undefined;

    const pii: UserPii = {
      email: current.email,
      name: data.name ?? current.name,
      phone: data.phone !== undefined ? data.phone || null : current.phone,
      bio: data.bio !== undefined ? data.bio || null : current.bio,
      instagramUrl:
        data.instagramUrl !== undefined
          ? data.instagramUrl || null
          : current.instagramUrl,
    };

    const {
      profileVisibility,
      styles,
      experienceLevel,
      scheduleVibe,
      gender,
      ageRange,
    } = data;
    const normalizeImage = (value: string | undefined) =>
      value !== undefined
        ? value
          ? (this.media.resolveObjectKey(value) ?? value)
          : value
        : undefined;
    const photoUrl = normalizeImage(data.photoUrl);
    const bannerUrl = normalizeImage(data.bannerUrl);
    const coverUrl = normalizeImage(data.coverUrl);
    const sealed = piiChanged
      ? this.crypto.sealPii(pii, existing.encryptedKey)
      : null;

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(sealed ?? {}),
        ...(photoUrl !== undefined ? { photoUrl } : {}),
        ...(bannerUrl !== undefined ? { bannerUrl } : {}),
        ...(coverUrl !== undefined ? { coverUrl } : {}),
        ...(styles !== undefined ? { styles } : {}),
        ...(experienceLevel !== undefined ? { experienceLevel } : {}),
        ...(scheduleVibe !== undefined ? { scheduleVibe } : {}),
        ...(gender !== undefined ? { gender } : {}),
        ...(ageRange !== undefined ? { ageRange } : {}),
        ...(data.preferredBranchId !== undefined
          ? { preferredBranchId: data.preferredBranchId || null }
          : {}),
        ...(profileVisibility !== undefined && !isAlwaysPublicRole(role)
          ? { profileVisibility }
          : isAlwaysPublicRole(role)
            ? { profileVisibility: ProfileVisibility.PUBLIC }
            : {}),
      },
    });

    return this.presentUser(updated);
  }

  async completeOnboarding(
    id: string,
    trial?: {
      personalTrial?: boolean;
      batchId?: string;
      sessionId?: string;
      trainerId?: string;
      startsAt?: string;
      endsAt?: string;
    },
  ) {
    const existing = await this.prisma.user.findUniqueOrThrow({
      where: { id },
    });
    const current = this.crypto.decryptUser(existing);
    const missing: string[] = [];

    if (!current.name?.trim() || current.name.trim() === "New User") {
      missing.push("name");
    }
    if (!current.experienceLevel) {
      missing.push("experienceLevel");
    }
    if (!current.gender) {
      missing.push("gender");
    }
    if (!current.ageRange) {
      missing.push("ageRange");
    }

    if (missing.length > 0) {
      throw new BadRequestException(
        `Onboarding incomplete: missing ${missing.join(", ")}`,
      );
    }

    if (current.onboardingCompletedAt) {
      return this.presentUser(existing);
    }

    const hasTrial =
      Boolean(trial?.personalTrial) ||
      Boolean(trial?.batchId) ||
      Boolean(trial?.sessionId) ||
      Boolean(trial?.trainerId) ||
      Boolean(trial?.startsAt && trial?.endsAt);

    if (hasTrial && current.studioId) {
      await this.createOnboardingTrial(current.studioId, id, trial ?? {});
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { onboardingCompletedAt: new Date() },
    });

    return this.presentUser(updated);
  }

  private async createOnboardingTrial(
    studioId: string,
    studentId: string,
    trial: {
      personalTrial?: boolean;
      batchId?: string;
      sessionId?: string;
      trainerId?: string;
      startsAt?: string;
      endsAt?: string;
    },
  ) {
    const trainerId = trial.trainerId;

    if (trainerId) {
      const trainer = await this.prisma.user.findFirst({
        where: {
          id: trainerId,
          studioId,
          role: UserRole.TRAINER,
        },
        select: { id: true },
      });
      if (!trainer) {
        throw new BadRequestException("Select a trainer from this studio");
      }
    }

    let batchId = trial.batchId;
    const sessionId = trial.sessionId;
    const startsAt = trial.startsAt;
    const endsAt = trial.endsAt;

    const isPersonalTimed =
      Boolean(startsAt && endsAt) && !batchId && !sessionId;
    if (trial.personalTrial || isPersonalTimed) {
      let start: Date | undefined;
      let end: Date | undefined;
      if (startsAt || endsAt) {
        if (!startsAt || !endsAt) {
          throw new BadRequestException(
            "Both startsAt and endsAt are required",
          );
        }
        start = new Date(startsAt);
        end = new Date(endsAt);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
          throw new BadRequestException("Invalid startsAt or endsAt");
        }
        if (end <= start) {
          throw new BadRequestException("endsAt must be after startsAt");
        }
      }

      const existingOpen = await this.prisma.booking.findFirst({
        where: {
          studioId,
          studentId,
          type: BookingType.TRIAL,
          OR: [
            {
              status: {
                in: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
              },
            },
            {
              status: BookingStatus.AWAITING_PAYMENT,
              paymentHoldExpiresAt: { gt: new Date() },
            },
          ],
        },
        select: { id: true, status: true },
      });
      if (existingOpen) {
        throw new ConflictException(
          existingOpen.status === BookingStatus.AWAITING_PAYMENT
            ? "Complete payment for your existing booking hold first"
            : existingOpen.status === BookingStatus.PENDING
              ? "You already have a booking request waiting for studio approval"
              : "You already have a confirmed trial booking",
        );
      }

      await this.prisma.booking.create({
        data: {
          studioId,
          studentId,
          type: BookingType.TRIAL,
          trainerId,
          startsAt: start,
          endsAt: end,
          notes: start ? PERSONAL_TRIAL_TIMED_NOTES : PERSONAL_TRIAL_NOTES,
          status: BookingStatus.PENDING,
        },
      });
      return;
    }

    if (sessionId) {
      const session = await this.prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          batch: { select: { id: true, studioId: true, active: true } },
        },
      });
      if (
        !session ||
        session.status === SessionStatus.CANCELLED ||
        !session.batch.active ||
        session.batch.studioId !== studioId ||
        session.startsAt < new Date()
      ) {
        throw new BadRequestException(
          "Select a trial class time from this studio",
        );
      }
      batchId = session.batchId;

      const existingOpen = await this.prisma.booking.findFirst({
        where: {
          studioId,
          studentId,
          type: BookingType.TRIAL,
          OR: [
            {
              status: {
                in: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
              },
            },
            {
              status: BookingStatus.AWAITING_PAYMENT,
              paymentHoldExpiresAt: { gt: new Date() },
            },
          ],
        },
        select: { id: true, status: true },
      });
      if (existingOpen) {
        throw new ConflictException(
          existingOpen.status === BookingStatus.AWAITING_PAYMENT
            ? "Complete payment for your existing booking hold first"
            : existingOpen.status === BookingStatus.PENDING
              ? "You already have a booking request waiting for studio approval"
              : "You already have a confirmed trial booking",
        );
      }

      await this.prisma.booking.create({
        data: {
          studioId,
          studentId,
          type: BookingType.TRIAL,
          batchId,
          sessionId,
          trainerId,
          status: BookingStatus.PENDING,
        },
      });
      return;
    }

    if (batchId) {
      throw new BadRequestException(
        "Please pick a session for your trial class",
      );
    }

    if (startsAt && endsAt) {
      const start = new Date(startsAt);
      const end = new Date(endsAt);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        throw new BadRequestException("Invalid startsAt or endsAt");
      }
      if (end <= start) {
        throw new BadRequestException("endsAt must be after startsAt");
      }
    } else if (startsAt || endsAt) {
      throw new BadRequestException("Both startsAt and endsAt are required");
    }

    await this.prisma.booking.create({
      data: {
        studioId,
        studentId,
        type: BookingType.TRIAL,
        batchId,
        sessionId,
        trainerId,
        startsAt: startsAt ? new Date(startsAt) : undefined,
        endsAt: endsAt ? new Date(endsAt) : undefined,
        status: BookingStatus.PENDING,
      },
    });
  }

  private async loadStudentFunnelRows(studioId: string) {
    const students = await this.prisma.user.findMany({
      where: { studioId, role: UserRole.STUDENT },
      select: {
        id: true,
        createdAt: true,
        ...userPiiSelect,
        role: true,
        photoUrl: true,
        gender: true,
        ageRange: true,
        active: true,
        batchEnrollments: {
          where: { batch: { studioId } },
          select: {
            batch: {
              select: {
                id: true,
                active: true,
                sessions: { select: { status: true } },
              },
            },
          },
        },
        bookings: {
          where: { studioId },
          select: {
            type: true,
            status: true,
            sessionId: true,
          },
        },
        attendanceRecords: {
          where: { session: { batch: { studioId } } },
          select: {
            sessionId: true,
            status: true,
          },
        },
        membershipSeats: {
          where: { membership: { subscription: { studioId } } },
          select: {
            membership: { select: { status: true } },
          },
        },
      },
    });

    return students.map((student) => {
      const {
        batchEnrollments,
        bookings,
        attendanceRecords,
        membershipSeats,
        ...user
      } = student;

      return {
        id: student.id,
        createdAt: student.createdAt,
        user,
        enrollments: batchEnrollments.map((enrollment) => ({
          batchId: enrollment.batch.id,
          batchActive: enrollment.batch.active,
          hasScheduledSession: batchHasScheduledSession(
            enrollment.batch.sessions,
          ),
          hasCompletedSession: batchHasCompletedSession(
            enrollment.batch.sessions,
          ),
        })),
        bookings,
        attendance: attendanceRecords,
        memberships: membershipSeats.map((seat) => ({
          status: seat.membership.status,
        })),
      };
    });
  }

  async getStudentFunnel(
    studioId: string,
    period: StudentFunnelPeriod = "lifetime",
  ): Promise<StudentFunnelCounts> {
    const students = await this.loadStudentFunnelRows(studioId);
    return countStudentFunnel(students, period);
  }

  async listStudentDirectory(
    studioId: string,
    options: {
      stage?: StudentFunnelStage;
      period?: StudentFunnelPeriod;
    } = {},
  ) {
    const period = options.period ?? "lifetime";
    const range = resolveStudentFunnelPeriod(period);
    const students = await this.loadStudentFunnelRows(studioId);
    const cohort = students.filter((student) =>
      isDateInRange(student.createdAt, range),
    );

    const presented = await Promise.all(
      cohort.map(async (student) => {
        const base = await this.presentUser(student.user);
        return {
          ...base,
          createdAt: student.createdAt.toISOString(),
          funnelStage: classifyStudentFunnelStage(student),
        };
      }),
    );

    const filtered = options.stage
      ? presented.filter((student) => student.funnelStage === options.stage)
      : presented;

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  async linkParentChild(parentUserId: string, childUserId: string) {
    const [parent, child] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: parentUserId } }),
      this.prisma.user.findUnique({ where: { id: childUserId } }),
    ]);

    if (!parent || !child) {
      throw new NotFoundException("Parent or child user not found");
    }

    if (parent.role !== UserRole.PARENT) {
      throw new BadRequestException("Parent user must have the PARENT role");
    }

    if (child.role !== UserRole.STUDENT) {
      throw new BadRequestException("Child user must have the STUDENT role");
    }

    return this.prisma.parentChild.upsert({
      where: {
        parentUserId_childUserId: { parentUserId, childUserId },
      },
      update: {},
      create: { parentUserId, childUserId },
    });
  }

  async linkChildByEmail(parent: DecryptedUser, email: string) {
    if (parent.role !== UserRole.PARENT) {
      throw new ForbiddenException("Only parents can link a child account");
    }
    if (!parent.studioId) {
      throw new BadRequestException("Parent must belong to a studio");
    }

    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      throw new BadRequestException("Email is required");
    }

    const emailHash = this.crypto.hashEmail(trimmed);
    const child = await this.prisma.user.findFirst({
      where: {
        studioId: parent.studioId,
        emailHash,
        role: UserRole.STUDENT,
      },
    });

    if (!child) {
      throw new NotFoundException("No student found with that email");
    }

    await this.linkParentChild(parent.id, child.id);
    return this.presentUser(child);
  }

  async listFamilyMembers(ownerUserId: string) {
    const [familyLinks, parentLinks] = await Promise.all([
      this.prisma.familyMember.findMany({
        where: { ownerUserId },
        include: { member: true },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.parentChild.findMany({
        where: { parentUserId: ownerUserId },
        include: { child: true },
      }),
    ]);

    const byId = new Map<
      string,
      {
        id: string;
        name: string;
        kind: FamilyMemberKind;
        photoUrl: string | null;
        isDependent: boolean;
      }
    >();

    for (const link of familyLinks) {
      const presented = await this.presentUser(link.member);
      byId.set(link.memberUserId, {
        id: presented.id,
        name: presented.name,
        kind: link.kind,
        photoUrl: presented.photoUrl,
        isDependent: link.member.firebaseUid.startsWith("dependent:"),
      });
    }

    for (const link of parentLinks) {
      if (byId.has(link.childUserId)) continue;
      const presented = await this.presentUser(link.child);
      byId.set(link.childUserId, {
        id: presented.id,
        name: presented.name,
        kind: FamilyMemberKind.KID,
        photoUrl: presented.photoUrl,
        isDependent: link.child.firebaseUid.startsWith("dependent:"),
      });
    }

    return Array.from(byId.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  async createFamilyMember(
    owner: DecryptedUser,
    data: {
      name: string;
      kind: FamilyMemberKind;
      gender: Gender;
      ageRange: AgeRange;
    },
  ) {
    const name = data.name.trim();
    if (!name) {
      throw new BadRequestException("Name is required");
    }
    if (!owner.studioId) {
      throw new BadRequestException("Owner must belong to a studio");
    }

    const dependentId = randomUUID();
    const syntheticEmail = `dependent+${dependentId}@internal.invalid`;
    const sealed = this.crypto.sealPii({
      email: syntheticEmail,
      name,
      phone: null,
      bio: null,
      instagramUrl: null,
    });

    const member = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          firebaseUid: `dependent:${dependentId}`,
          ...sealed,
          role: UserRole.STUDENT,
          studioId: owner.studioId,
          gender: data.gender,
          ageRange: data.ageRange,
          styles: [],
          profileVisibility: ProfileVisibility.PRIVATE,
          onboardingCompletedAt: new Date(),
        },
      });

      await tx.familyMember.create({
        data: {
          ownerUserId: owner.id,
          memberUserId: created.id,
          kind: data.kind,
        },
      });

      return created;
    });

    const presented = await this.presentUser(member);
    return {
      id: presented.id,
      name: presented.name,
      kind: data.kind,
      photoUrl: presented.photoUrl,
      isDependent: true,
    };
  }

  async removeFamilyMember(ownerUserId: string, memberUserId: string) {
    const link = await this.prisma.familyMember.findUnique({
      where: {
        ownerUserId_memberUserId: { ownerUserId, memberUserId },
      },
      include: { member: true },
    });

    if (!link) {
      throw new NotFoundException("Family member link not found");
    }

    await this.prisma.familyMember.delete({
      where: {
        ownerUserId_memberUserId: { ownerUserId, memberUserId },
      },
    });

    const isDependent = link.member.firebaseUid.startsWith("dependent:");
    if (!isDependent) {
      return { removed: true, deletedDependent: false };
    }

    const [otherFamily, otherParent, seats, enrollments] = await Promise.all([
      this.prisma.familyMember.count({ where: { memberUserId } }),
      this.prisma.parentChild.count({ where: { childUserId: memberUserId } }),
      this.prisma.membershipCoveredStudent.count({
        where: { studentId: memberUserId },
      }),
      this.prisma.batchEnrollment.count({
        where: { studentId: memberUserId },
      }),
    ]);

    if (
      otherFamily === 0 &&
      otherParent === 0 &&
      seats === 0 &&
      enrollments === 0
    ) {
      await this.prisma.user.delete({ where: { id: memberUserId } });
      return { removed: true, deletedDependent: true };
    }

    return { removed: true, deletedDependent: false };
  }

  async isLinkedFamilyMember(ownerUserId: string, memberUserId: string) {
    const [family, parent] = await Promise.all([
      this.prisma.familyMember.findUnique({
        where: {
          ownerUserId_memberUserId: { ownerUserId, memberUserId },
        },
      }),
      this.prisma.parentChild.findUnique({
        where: {
          parentUserId_childUserId: {
            parentUserId: ownerUserId,
            childUserId: memberUserId,
          },
        },
      }),
    ]);
    return Boolean(family || parent);
  }
}

export type { DecryptedUser };
