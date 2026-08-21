import { randomBytes, randomUUID } from "node:crypto";
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
import { FirebaseService } from "../auth/firebase.service";
import { assertBatchHasSeat, lockBatchRow } from "../batches/batch-capacity";
import { REACTIVATE_ENROLLMENT_DATA } from "../batches/enrollment-status";
import {
  accumulatePaidMonths,
  batchIdsForInvoiceDisplay,
  batchLabelForInvoice,
  loadPaidMonthsByStudent,
  paidMonthsInvoiceSelect,
  paidMonthsInvoiceWhere,
  parseCombineMeta,
  parsePurchaseMeta,
  resolvePlanCadenceBySubscriptionId,
} from "../billing/family-combine";
import { MediaService } from "../media/media.service";
import { PrismaService } from "../prisma/prisma.service";
import { isAlwaysPublicRole } from "../social/visibility";
import { ageFromDateOfBirth, ageRangeFromAge } from "./age-range";
import {
  classifyLeadSection,
  LEAD_REMARK_MAX_LENGTH,
  type LeadDateFilter,
  type LeadDto,
  type LeadRemarkDto,
  type LeadSection,
  leadSectionAppliesDateFilter,
  paginateLeads,
  resolveDateKeyRange,
  resolveLeadDayRange,
} from "./leads";
import { matchesPersonSearch } from "./person-search";
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

function generateTemporaryPassword() {
  return `Su-${randomBytes(6).toString("base64url")}`;
}

type TemporaryPasswordResult = {
  id: string;
  email: string;
  name: string;
  firebaseUid: string;
  temporaryPassword: string;
  setupHint: string;
};

type LoadedTrialBooking = {
  id: string;
  studentId: string;
  status: BookingStatus;
  sessionId: string | null;
  startsAt: Date | null;
  session: {
    startsAt: Date;
    batch: { name: string } | null;
  } | null;
  batch: { name: string } | null;
};

function loadedTrialSessionStartsAt(booking: LoadedTrialBooking): Date | null {
  return booking.session?.startsAt ?? booking.startsAt ?? null;
}

function loadedTrialBatchName(booking: LoadedTrialBooking): string | null {
  return booking.session?.batch?.name ?? booking.batch?.name ?? null;
}

function isOpenTrialStatus(status: BookingStatus): boolean {
  return status === BookingStatus.PENDING || status === BookingStatus.CONFIRMED;
}

function isLoadedTrialAttended(
  booking: LoadedTrialBooking,
  attendance: Array<{ sessionId: string; status: AttendanceStatus }>,
): boolean {
  if (booking.status === BookingStatus.COMPLETED) return true;
  if (!booking.sessionId) return false;
  return attendance.some(
    (record) =>
      record.sessionId === booking.sessionId &&
      record.status === AttendanceStatus.PRESENT,
  );
}

function trialBookingsByTimeDesc(
  bookings: LoadedTrialBooking[],
): LoadedTrialBooking[] {
  return [...bookings].sort(
    (a, b) =>
      (loadedTrialSessionStartsAt(b)?.getTime() ?? 0) -
      (loadedTrialSessionStartsAt(a)?.getTime() ?? 0),
  );
}

function relevantTrialForSection(
  section: LeadSection,
  bookings: LoadedTrialBooking[],
  attendance: Array<{ sessionId: string; status: AttendanceStatus }>,
  now: Date,
): LoadedTrialBooking | null {
  const upcoming = () =>
    trialBookingsByTimeDesc(
      bookings.filter((booking) => {
        const startsAt = loadedTrialSessionStartsAt(booking);
        return (
          isOpenTrialStatus(booking.status) &&
          startsAt !== null &&
          startsAt > now
        );
      }),
    )[0] ?? null;

  if (section === "trialBooked") return upcoming();

  if (section === "trialAttended") {
    return (
      trialBookingsByTimeDesc(
        bookings.filter((booking) =>
          isLoadedTrialAttended(booking, attendance),
        ),
      )[0] ?? null
    );
  }

  if (section === "trialMissed") {
    return (
      trialBookingsByTimeDesc(
        bookings.filter((booking) => {
          const startsAt = loadedTrialSessionStartsAt(booking);
          return (
            isOpenTrialStatus(booking.status) &&
            startsAt !== null &&
            startsAt <= now
          );
        }),
      )[0] ?? null
    );
  }

  const nextUpcoming = upcoming();
  if (nextUpcoming) return nextUpcoming;
  return (
    trialBookingsByTimeDesc(
      bookings.filter(
        (booking) => loadedTrialSessionStartsAt(booking) !== null,
      ),
    )[0] ?? null
  );
}

@Injectable()
export class UsersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(UserCryptoService) private readonly crypto: UserCryptoService,
    @Inject(MediaService) private readonly media: MediaService,
    @Inject(FirebaseService) private readonly firebase: FirebaseService,
  ) {}

  private resolveAgeFields(data: {
    dateOfBirth?: string;
    age?: number;
    ageRange?: AgeRange;
  }): { dateOfBirth?: Date; ageYears?: number; ageRange: AgeRange } {
    if (data.dateOfBirth !== undefined) {
      const dob = new Date(`${data.dateOfBirth}T00:00:00.000Z`);
      const age = ageFromDateOfBirth(dob);
      if (Number.isNaN(dob.getTime()) || age === null) {
        throw new BadRequestException(
          "Date of birth is invalid or in the future",
        );
      }
      return { dateOfBirth: dob, ageRange: ageRangeFromAge(age) };
    }
    if (data.age !== undefined) {
      return { ageYears: data.age, ageRange: ageRangeFromAge(data.age) };
    }
    if (data.ageRange !== undefined) {
      return { ageRange: data.ageRange };
    }
    throw new BadRequestException("date of birth or age is required");
  }

  private resolveTemporaryPassword(requested?: string) {
    const temporaryPassword = requested?.trim() || generateTemporaryPassword();
    if (temporaryPassword.length < 8) {
      throw new BadRequestException(
        "Temporary password must be at least 8 characters",
      );
    }
    return temporaryPassword;
  }

  private async applyTemporaryPassword(input: {
    userId: string;
    email: string;
    name: string;
    firebaseUid: string;
    temporaryPassword?: string;
  }): Promise<TemporaryPasswordResult> {
    const temporaryPassword = this.resolveTemporaryPassword(
      input.temporaryPassword,
    );
    let firebaseUid = input.firebaseUid;

    await this.prisma.user.update({
      where: { id: input.userId },
      data: { mustChangePassword: true },
    });

    try {
      const firebaseUser = await this.firebase.ensureEmailPasswordUser({
        email: input.email,
        password: temporaryPassword,
        displayName: input.name,
      });
      if (firebaseUser) {
        const conflict = await this.prisma.user.findFirst({
          where: {
            firebaseUid: firebaseUser.uid,
            id: { not: input.userId },
          },
          select: { id: true },
        });
        if (conflict) {
          throw new ConflictException(
            "A Firebase account for this email is already linked to another user",
          );
        }
        if (firebaseUser.uid !== firebaseUid) {
          await this.prisma.user.update({
            where: { id: input.userId },
            data: { firebaseUid: firebaseUser.uid },
          });
          firebaseUid = firebaseUser.uid;
        }
      }
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
    }

    return {
      id: input.userId,
      email: input.email,
      name: input.name,
      firebaseUid,
      temporaryPassword,
      setupHint: `Share this temporary password with ${input.email}. They must change it on first login.`,
    };
  }

  private async presentUser<
    T extends EncryptedUserFields & {
      photoUrl?: string | null;
      bannerUrl?: string | null;
      coverUrl?: string | null;
      dateOfBirth?: Date | null;
      ageYears?: number | null;
      ageRange?: AgeRange | null;
    },
  >(user: T) {
    const decrypted = this.crypto.decryptUser(user);
    const ageFromDob = user.dateOfBirth
      ? ageFromDateOfBirth(user.dateOfBirth)
      : null;
    return {
      ...decrypted,
      photoUrl: await this.media.signReadUrl(user.photoUrl ?? null),
      ...(user.bannerUrl !== undefined
        ? { bannerUrl: await this.media.signReadUrl(user.bannerUrl) }
        : {}),
      ...(user.coverUrl !== undefined
        ? { coverUrl: await this.media.signReadUrl(user.coverUrl) }
        : {}),
      ...(user.dateOfBirth !== undefined
        ? {
            dateOfBirth: user.dateOfBirth
              ? user.dateOfBirth.toISOString().slice(0, 10)
              : null,
          }
        : {}),
      ...(user.dateOfBirth !== undefined || user.ageYears !== undefined
        ? { age: ageFromDob ?? user.ageYears ?? null }
        : {}),
      ...(user.ageRange !== undefined ? { ageRange: user.ageRange } : {}),
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

  async listStudioFamilies(studioId: string) {
    const memberSelect = {
      id: true,
      ...userPiiSelect,
      role: true,
      photoUrl: true,
    };

    const [familyLinks, parentLinks] = await Promise.all([
      this.prisma.familyMember.findMany({
        where: { owner: { studioId } },
        select: {
          kind: true,
          owner: { select: memberSelect },
          member: { select: memberSelect },
        },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.parentChild.findMany({
        where: { parent: { studioId } },
        select: {
          parent: { select: memberSelect },
          child: { select: memberSelect },
        },
      }),
    ]);

    type SelectedMember = EncryptedUserFields & {
      id: string;
      role: UserRole;
      photoUrl: string | null;
    };
    type FamilySeatRole = "ADULT" | "KID";
    type FamilyGroup = {
      ownerId: string;
      ownerName: string;
      ownerRole: UserRole;
      ownerPhotoUrl: string | null;
      members: Array<{
        id: string;
        name: string;
        photoUrl: string | null;
        seatRole: FamilySeatRole;
      }>;
    };

    const groups = new Map<string, FamilyGroup>();

    const ensureGroup = async (owner: SelectedMember) => {
      const existing = groups.get(owner.id);
      if (existing) return existing;
      const presented = await this.presentUser(owner);
      const group: FamilyGroup = {
        ownerId: presented.id,
        ownerName: presented.name,
        ownerRole: owner.role,
        ownerPhotoUrl: presented.photoUrl,
        members: [],
      };
      groups.set(owner.id, group);
      return group;
    };

    const addMember = async (
      group: FamilyGroup,
      member: SelectedMember,
      seatRole: FamilySeatRole,
    ) => {
      if (group.members.some((existing) => existing.id === member.id)) return;
      const presented = await this.presentUser(member);
      group.members.push({
        id: presented.id,
        name: presented.name,
        photoUrl: presented.photoUrl,
        seatRole,
      });
    };

    for (const link of familyLinks) {
      const group = await ensureGroup(link.owner);
      await addMember(
        group,
        link.member,
        link.kind === FamilyMemberKind.KID ? "KID" : "ADULT",
      );
    }

    for (const link of parentLinks) {
      const group = await ensureGroup(link.parent);
      await addMember(group, link.child, "KID");
    }

    return Array.from(groups.values()).sort((a, b) =>
      a.ownerName.localeCompare(b.ownerName),
    );
  }

  async listStudents(
    studioId: string,
    options: {
      q?: string;
      cursor?: string;
      limit?: number;
      includeParents?: boolean;
    } = {},
  ) {
    const limit = Math.min(Math.max(options.limit ?? 50, 1), 50);
    const roles = options.includeParents
      ? [UserRole.STUDENT, UserRole.PARENT]
      : [UserRole.STUDENT];

    const users = await this.prisma.user.findMany({
      where: {
        studioId,
        role: { in: roles },
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

    const query = options.q?.trim();
    const filtered = query
      ? presented.filter((user) => matchesPersonSearch(user, query))
      : presented;

    let startIndex = 0;
    if (options.cursor) {
      const cursorIndex = filtered.findIndex(
        (user) => user.id === options.cursor,
      );
      startIndex = cursorIndex >= 0 ? cursorIndex + 1 : 0;
    }

    const page = filtered.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + page.length < filtered.length;

    return {
      items: page,
      nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
    };
  }

  async createStudent(data: {
    studioId: string;
    name: string;
    email: string;
    gender: Gender;
    dateOfBirth?: string;
    age?: number;
    guardianName?: string;
    alternateMobile?: string;
    ageRange?: AgeRange;
    phone?: string;
    styles?: string[];
    batchId?: string;
    temporaryPassword?: string;
  }) {
    const ageFields = this.resolveAgeFields(data);
    const student = await this.createStudioMember({
      studioId: data.studioId,
      name: data.name,
      email: data.email,
      gender: data.gender,
      dateOfBirth: ageFields.dateOfBirth,
      ageYears: ageFields.ageYears,
      ageRange: ageFields.ageRange,
      guardianName: data.guardianName,
      alternateMobile: data.alternateMobile,
      phone: data.phone,
      styles: data.styles,
      role: UserRole.STUDENT,
      issueLoginCredentials: true,
      temporaryPassword: data.temporaryPassword,
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
        update: REACTIVATE_ENROLLMENT_DATA,
        create: {
          batchId,
          studentId,
          status: "ACTIVE",
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
    temporaryPassword?: string;
  }) {
    return this.createStudioMember({
      ...data,
      role: UserRole.TRAINER,
      issueLoginCredentials: true,
      temporaryPassword: data.temporaryPassword,
    });
  }

  private async createStudioMember(data: {
    studioId: string;
    name: string;
    email: string;
    gender: Gender;
    ageRange: AgeRange;
    dateOfBirth?: Date;
    ageYears?: number;
    guardianName?: string;
    alternateMobile?: string;
    phone?: string;
    role: typeof UserRole.STUDENT | typeof UserRole.TRAINER;
    styles?: string[];
    issueLoginCredentials?: boolean;
    temporaryPassword?: string;
  }) {
    const email = data.email.trim().toLowerCase();
    const name = data.name.trim();
    const emailHash = this.crypto.hashEmail(email);
    const existing = await this.prisma.user.findFirst({
      where: {
        studioId: data.studioId,
        emailHash,
      },
    });

    if (existing) {
      throw new ConflictException("A user with this email already exists");
    }

    const temporaryPassword = data.issueLoginCredentials
      ? this.resolveTemporaryPassword(data.temporaryPassword)
      : null;

    const sealed = this.crypto.sealPii({
      email,
      name,
      phone: data.phone ?? null,
      bio: null,
      instagramUrl: null,
      guardianName: data.guardianName?.trim() || null,
      alternateMobile: data.alternateMobile?.trim() || null,
    });

    const user = await this.prisma.user.create({
      data: {
        firebaseUid: `staff-created:${randomUUID()}`,
        ...sealed,
        role: data.role,
        studioId: data.studioId,
        gender: data.gender,
        ageRange: data.ageRange,
        ...(data.dateOfBirth !== undefined
          ? { dateOfBirth: data.dateOfBirth }
          : {}),
        ...(data.ageYears !== undefined ? { ageYears: data.ageYears } : {}),
        styles: data.styles ?? [],
        profileVisibility: isAlwaysPublicRole(data.role)
          ? ProfileVisibility.PUBLIC
          : ProfileVisibility.PRIVATE,
        ...(temporaryPassword ? { mustChangePassword: true } : {}),
      },
      select: {
        id: true,
        firebaseUid: true,
        ...userPiiSelect,
        role: true,
        mustChangePassword: true,
        dateOfBirth: true,
        ageYears: true,
        ageRange: true,
      },
    });

    if (!temporaryPassword) {
      return this.presentUser(user);
    }

    const credentials = await this.applyTemporaryPassword({
      userId: user.id,
      email,
      name,
      firebaseUid: user.firebaseUid,
      temporaryPassword,
    });

    const presented = await this.presentUser({
      ...user,
      firebaseUid: credentials.firebaseUid,
      mustChangePassword: true,
    });

    return {
      ...presented,
      temporaryPassword: credentials.temporaryPassword,
      setupHint: credentials.setupHint,
    };
  }

  async resetStudentTemporaryPassword(
    studioId: string,
    studentId: string,
    temporaryPassword?: string,
  ) {
    return this.resetStudioMemberTemporaryPassword(
      studioId,
      studentId,
      UserRole.STUDENT,
      temporaryPassword,
    );
  }

  async resetTrainerTemporaryPassword(
    studioId: string,
    trainerId: string,
    temporaryPassword?: string,
  ) {
    return this.resetStudioMemberTemporaryPassword(
      studioId,
      trainerId,
      UserRole.TRAINER,
      temporaryPassword,
    );
  }

  private async resetStudioMemberTemporaryPassword(
    studioId: string,
    memberId: string,
    role: typeof UserRole.STUDENT | typeof UserRole.TRAINER,
    temporaryPassword?: string,
  ) {
    const member = await this.prisma.user.findFirst({
      where: {
        id: memberId,
        studioId,
        role,
      },
      select: {
        id: true,
        firebaseUid: true,
        ...userPiiSelect,
      },
    });

    if (!member) {
      throw new NotFoundException(
        role === UserRole.TRAINER ? "Trainer not found" : "Student not found",
      );
    }

    const decrypted = this.crypto.decryptUser(member);
    const credentials = await this.applyTemporaryPassword({
      userId: member.id,
      email: decrypted.email,
      name: decrypted.name,
      firebaseUid: member.firebaseUid,
      temporaryPassword,
    });

    return {
      id: credentials.id,
      email: credentials.email,
      name: credentials.name,
      temporaryPassword: credentials.temporaryPassword,
      setupHint: credentials.setupHint,
    };
  }

  async resetOwnerTemporaryPassword(
    studioId: string,
    temporaryPassword?: string,
  ) {
    const studio = await this.prisma.studio.findUnique({
      where: { id: studioId },
      select: {
        id: true,
        owner: {
          select: {
            id: true,
            firebaseUid: true,
            role: true,
            ...userPiiSelect,
          },
        },
      },
    });

    if (!studio) {
      throw new NotFoundException("Studio not found");
    }

    if (studio.owner.role !== UserRole.OWNER) {
      throw new BadRequestException("Studio owner record is invalid");
    }

    const decrypted = this.crypto.decryptUser(studio.owner);
    const credentials = await this.applyTemporaryPassword({
      userId: studio.owner.id,
      email: decrypted.email,
      name: decrypted.name,
      firebaseUid: studio.owner.firebaseUid,
      temporaryPassword,
    });

    return {
      id: credentials.id,
      email: credentials.email,
      name: credentials.name,
      temporaryPassword: credentials.temporaryPassword,
      setupHint: credentials.setupHint,
    };
  }

  async createStudents(
    studioId: string,
    students: Array<{
      name: string;
      email: string;
      gender: Gender;
      age?: number;
      dateOfBirth?: string;
      guardianName?: string;
      alternateMobile?: string;
      phone?: string | null;
    }>,
  ) {
    const uniqueStudents = Array.from(
      new Map(
        students.map((student) => {
          const ageFields = this.resolveAgeFields(student);
          return [
            student.email.trim().toLowerCase(),
            {
              name: student.name.trim(),
              email: student.email.trim().toLowerCase(),
              gender: student.gender,
              ...ageFields,
              guardianName: student.guardianName?.trim() || null,
              alternateMobile: student.alternateMobile?.trim() || null,
              phone: student.phone?.trim() || null,
            },
          ];
        }),
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
            phone: student.phone,
            bio: null,
            instagramUrl: null,
            guardianName: student.guardianName,
            alternateMobile: student.alternateMobile,
          }),
          role: UserRole.STUDENT,
          studioId,
          gender: student.gender,
          ageRange: student.ageRange,
          ...(student.dateOfBirth !== undefined
            ? { dateOfBirth: student.dateOfBirth }
            : {}),
          ...(student.ageYears !== undefined
            ? { ageYears: student.ageYears }
            : {}),
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
        dateOfBirth: true,
        ageYears: true,
        ageRange: true,
      },
    });

    if (!student) {
      throw new NotFoundException("Student not found in this studio");
    }

    const familyUserSelect = {
      id: true,
      ...userPiiSelect,
      role: true,
      photoUrl: true,
      active: true,
      dateOfBirth: true,
      ageYears: true,
      ageRange: true,
    };

    const [
      enrollments,
      memberships,
      attendanceRecords,
      invoices,
      parentLinks,
      ownedFamilyLinks,
      membershipFamilyLinks,
      paidInvoices,
    ] = await Promise.all([
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
        include: {
          membership: { select: { periodStart: true } },
        },
      }),
      this.prisma.parentChild.findMany({
        where: { childUserId: studentId },
        include: {
          parent: {
            select: familyUserSelect,
          },
        },
      }),
      this.prisma.familyMember.findMany({
        where: { ownerUserId: studentId },
        include: {
          member: {
            select: familyUserSelect,
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.familyMember.findMany({
        where: { memberUserId: studentId },
        include: {
          owner: {
            select: familyUserSelect,
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.invoice.findMany({
        where: paidMonthsInvoiceWhere(studioId, [studentId]),
        select: paidMonthsInvoiceSelect,
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

    const cadenceBySubscriptionId = await resolvePlanCadenceBySubscriptionId(
      this.prisma,
      paidInvoices,
    );
    const paidMonths =
      accumulatePaidMonths(paidInvoices, {
        onlyStudentIds: new Set([studentId]),
        cadenceBySubscriptionId,
      }).get(studentId) ?? 0;

    const studentBatchMap = new Map<string, Set<string>>([
      [
        studentId,
        new Set(
          enrollments
            .filter((enrollment) => enrollment.status === "ACTIVE")
            .map((enrollment) => enrollment.batch.id),
        ),
      ],
    ]);
    const batchNameById = new Map(
      enrollments.map(
        (enrollment) => [enrollment.batch.id, enrollment.batch.name] as const,
      ),
    );
    const batchIdsToResolve = new Set<string>();
    for (const invoice of invoices) {
      for (const batchId of batchIdsForInvoiceDisplay({
        studentId: invoice.studentId,
        purchaseMeta: parsePurchaseMeta(invoice.purchaseMeta),
        combineMeta: parseCombineMeta(invoice.combineMeta),
        studentBatchMap,
      })) {
        batchIdsToResolve.add(batchId);
      }
    }
    const missingBatchIds = [...batchIdsToResolve].filter(
      (batchId) => !batchNameById.has(batchId),
    );
    if (missingBatchIds.length > 0) {
      const extraBatches = await this.prisma.batch.findMany({
        where: { id: { in: missingBatchIds }, studioId },
        select: { id: true, name: true },
      });
      for (const batch of extraBatches) {
        batchNameById.set(batch.id, batch.name);
      }
    }

    return {
      student: await this.presentUser(student),
      paidMonths,
      batches: enrollments.map((enrollment) => ({
        ...enrollment.batch,
        enrollmentStatus: enrollment.status,
        enrolledAt: enrollment.enrolledAt,
        endedAt: enrollment.endedAt,
      })),
      memberships,
      attendance,
      invoices: invoices.map((invoice) => {
        const purchaseMeta = parsePurchaseMeta(invoice.purchaseMeta);
        const combineMeta = parseCombineMeta(invoice.combineMeta);
        const { batchId, batchName } = batchLabelForInvoice({
          studentId: invoice.studentId,
          purchaseMeta,
          combineMeta,
          studentBatchMap,
          batchNameById,
        });
        return {
          ...invoice,
          amount: Number(invoice.amount),
          referralDiscount: Number(invoice.referralDiscount ?? 0),
          studioDiscount: Number(invoice.studioDiscount ?? 0),
          batchId,
          batchName,
        };
      }),
      parents: await Promise.all(
        parentLinks.map(async (link) => this.presentUser(link.parent)),
      ),
      family: await this.presentStudentFamily({
        parentLinks,
        ownedFamilyLinks,
        membershipFamilyLinks,
      }),
    };
  }

  private async presentStudentFamily(args: {
    parentLinks: Array<{
      parent: EncryptedUserFields & {
        id: string;
        role: UserRole;
        photoUrl: string | null;
        active: boolean;
      };
    }>;
    ownedFamilyLinks: Array<{
      kind: FamilyMemberKind;
      member: EncryptedUserFields & {
        id: string;
        role: UserRole;
        photoUrl: string | null;
        active: boolean;
      };
    }>;
    membershipFamilyLinks: Array<{
      owner: EncryptedUserFields & {
        id: string;
        role: UserRole;
        photoUrl: string | null;
        active: boolean;
      };
    }>;
  }) {
    type FamilyRelation = "PARENT" | "KID" | "CO_STUDENT" | "FAMILY";
    const byId = new Map<
      string,
      {
        id: string;
        name: string;
        email: string;
        phone: string | null;
        photoUrl: string | null;
        role: UserRole;
        relation: FamilyRelation;
      }
    >();

    for (const link of args.parentLinks) {
      const presented = await this.presentUser(link.parent);
      byId.set(presented.id, {
        id: presented.id,
        name: presented.name,
        email: presented.email,
        phone: presented.phone,
        photoUrl: presented.photoUrl,
        role: link.parent.role,
        relation: "PARENT",
      });
    }

    for (const link of args.ownedFamilyLinks) {
      if (byId.has(link.member.id)) continue;
      const presented = await this.presentUser(link.member);
      byId.set(presented.id, {
        id: presented.id,
        name: presented.name,
        email: presented.email,
        phone: presented.phone,
        photoUrl: presented.photoUrl,
        role: link.member.role,
        relation: link.kind === FamilyMemberKind.KID ? "KID" : "CO_STUDENT",
      });
    }

    for (const link of args.membershipFamilyLinks) {
      if (byId.has(link.owner.id)) continue;
      const presented = await this.presentUser(link.owner);
      byId.set(presented.id, {
        id: presented.id,
        name: presented.name,
        email: presented.email,
        phone: presented.phone,
        photoUrl: presented.photoUrl,
        role: link.owner.role,
        relation: link.owner.role === UserRole.PARENT ? "PARENT" : "FAMILY",
      });
    }

    return Array.from(byId.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  async updateStudioStudent(
    studioId: string,
    studentId: string,
    data: {
      name?: string;
      phone?: string;
      dateOfBirth?: string;
      age?: number;
      guardianName?: string;
      alternateMobile?: string;
      active?: boolean;
    },
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
      data.dateOfBirth === undefined &&
      data.age === undefined &&
      data.guardianName === undefined &&
      data.alternateMobile === undefined &&
      data.active === undefined
    ) {
      throw new BadRequestException("No student fields to update");
    }

    if (
      data.name !== undefined ||
      data.phone !== undefined ||
      data.dateOfBirth !== undefined ||
      data.age !== undefined ||
      data.guardianName !== undefined ||
      data.alternateMobile !== undefined
    ) {
      await this.updateProfile(studentId, UserRole.STUDENT, {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.dateOfBirth !== undefined
          ? { dateOfBirth: data.dateOfBirth }
          : {}),
        ...(data.age !== undefined ? { age: data.age } : {}),
        ...(data.guardianName !== undefined
          ? { guardianName: data.guardianName }
          : {}),
        ...(data.alternateMobile !== undefined
          ? { alternateMobile: data.alternateMobile }
          : {}),
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
      dateOfBirth?: string;
      age?: number;
      guardianName?: string;
      alternateMobile?: string;
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
      data.instagramUrl !== undefined ||
      data.guardianName !== undefined ||
      data.alternateMobile !== undefined;

    const pii: UserPii = {
      email: current.email,
      name: data.name ?? current.name,
      phone: data.phone !== undefined ? data.phone || null : current.phone,
      bio: data.bio !== undefined ? data.bio || null : current.bio,
      instagramUrl:
        data.instagramUrl !== undefined
          ? data.instagramUrl || null
          : current.instagramUrl,
      guardianName:
        data.guardianName !== undefined
          ? data.guardianName || null
          : current.guardianName,
      alternateMobile:
        data.alternateMobile !== undefined
          ? data.alternateMobile || null
          : current.alternateMobile,
    };

    const {
      profileVisibility,
      styles,
      experienceLevel,
      scheduleVibe,
      gender,
      ageRange,
      dateOfBirth,
      age,
    } = data;

    if (
      (role === UserRole.STUDENT || role === UserRole.PARENT) &&
      !existing.ageRange &&
      !existing.dateOfBirth &&
      !existing.ageYears &&
      dateOfBirth === undefined &&
      age === undefined &&
      ageRange === undefined
    ) {
      throw new BadRequestException("date of birth or age is required");
    }

    const ageFields =
      dateOfBirth !== undefined || age !== undefined || ageRange !== undefined
        ? this.resolveAgeFields({ dateOfBirth, age, ageRange })
        : null;
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
        ...(ageFields ? { ageRange: ageFields.ageRange } : {}),
        ...(ageFields?.dateOfBirth !== undefined
          ? { dateOfBirth: ageFields.dateOfBirth, ageYears: null }
          : {}),
        ...(ageFields?.ageYears !== undefined
          ? { ageYears: ageFields.ageYears, dateOfBirth: null }
          : {}),
        ...(data.preferredBranchId !== undefined
          ? { preferredBranchId: data.preferredBranchId || null }
          : {}),
        ...(profileVisibility !== undefined && !isAlwaysPublicRole(role)
          ? { profileVisibility }
          : isAlwaysPublicRole(role)
            ? { profileVisibility: ProfileVisibility.PUBLIC }
            : {}),
      },
      select: {
        id: true,
        ...userPiiSelect,
        photoUrl: true,
        dateOfBirth: true,
        ageYears: true,
        ageRange: true,
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
            status: true,
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
          enrollmentActive: enrollment.status === "ACTIVE",
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

    const cohortIds = cohort.map((student) => student.id);
    const paidMonthsByStudent = await loadPaidMonthsByStudent(
      this.prisma,
      studioId,
      cohortIds,
    );

    const presented = await Promise.all(
      cohort.map(async (student) => {
        const base = await this.presentUser(student.user);
        return {
          ...base,
          createdAt: student.createdAt.toISOString(),
          funnelStage: classifyStudentFunnelStage(student),
          paidMonths: paidMonthsByStudent.get(student.id) ?? 0,
        };
      }),
    );

    const filtered = options.stage
      ? presented.filter((student) => student.funnelStage === options.stage)
      : presented;

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  async listLeads(
    studioId: string,
    options: {
      section?: LeadSection;
      filter?: LeadDateFilter;
      from?: string;
      to?: string;
      q?: string;
      cursor?: string;
      limit?: number;
    } = {},
  ) {
    const section = options.section ?? "new";
    const dayRange = leadSectionAppliesDateFilter(section)
      ? options.from && options.to
        ? resolveDateKeyRange(options.from, options.to)
        : resolveLeadDayRange(options.filter ?? "all")
      : null;
    const now = new Date();

    const [students, trialBookings, latestRemarks] = await Promise.all([
      this.prisma.user.findMany({
        where: { studioId, role: UserRole.STUDENT },
        select: {
          id: true,
          createdAt: true,
          active: true,
          ageRange: true,
          photoUrl: true,
          ...userPiiSelect,
          batchEnrollments: {
            where: { batch: { studioId } },
            select: {
              status: true,
              batch: {
                select: {
                  id: true,
                  active: true,
                  sessions: { select: { status: true } },
                },
              },
            },
          },
          attendanceRecords: {
            where: { session: { batch: { studioId } } },
            select: {
              sessionId: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.booking.findMany({
        where: {
          studioId,
          type: BookingType.TRIAL,
          status: {
            notIn: [BookingStatus.CANCELLED, BookingStatus.AWAITING_PAYMENT],
          },
        },
        select: {
          id: true,
          studentId: true,
          status: true,
          sessionId: true,
          startsAt: true,
          session: {
            select: {
              startsAt: true,
              batch: { select: { name: true } },
            },
          },
          batch: { select: { name: true } },
        },
        orderBy: [{ startsAt: "asc" }, { id: "desc" }],
      }),
      this.prisma.leadRemark.groupBy({
        by: ["studentId"],
        where: { studioId },
        _max: { createdAt: true },
      }),
    ]);

    const lastFollowupByStudent = new Map(
      latestRemarks.map((row) => [
        row.studentId,
        row._max.createdAt?.toISOString() ?? null,
      ]),
    );

    const trialBookingsByStudent = new Map<string, LoadedTrialBooking[]>();
    for (const booking of trialBookings) {
      const list = trialBookingsByStudent.get(booking.studentId);
      if (list) {
        list.push(booking);
      } else {
        trialBookingsByStudent.set(booking.studentId, [booking]);
      }
    }

    const leads: LeadDto[] = [];

    for (const student of students) {
      const { batchEnrollments, attendanceRecords, ...user } = student;

      const enrollments = batchEnrollments.map((enrollment) => ({
        batchId: enrollment.batch.id,
        batchActive: enrollment.batch.active,
        enrollmentActive: enrollment.status === "ACTIVE",
        hasScheduledSession: batchHasScheduledSession(
          enrollment.batch.sessions,
        ),
        hasCompletedSession: batchHasCompletedSession(
          enrollment.batch.sessions,
        ),
      }));
      const attendance = attendanceRecords;

      const bookings = (trialBookingsByStudent.get(student.id) ?? []).map(
        (booking) => ({
          status: booking.status,
          sessionId: booking.sessionId,
          sessionStartsAt: loadedTrialSessionStartsAt(booking),
        }),
      );

      const leadSection = classifyLeadSection(
        { active: student.active, enrollments, bookings, attendance },
        now,
      );
      if (leadSection !== section) continue;

      const relevant = relevantTrialForSection(
        leadSection,
        trialBookingsByStudent.get(student.id) ?? [],
        attendance,
        now,
      );

      if (dayRange) {
        const startsAt = relevant ? loadedTrialSessionStartsAt(relevant) : null;
        if (!startsAt) continue;
        if (startsAt < dayRange.start || startsAt > dayRange.end) continue;
      }

      const presented = await this.presentUser(user);
      leads.push({
        id: presented.id,
        name: presented.name,
        phone: presented.phone ?? null,
        photoUrl: presented.photoUrl ?? null,
        ageRange: student.ageRange,
        createdAt: student.createdAt.toISOString(),
        active: student.active,
        section: leadSection,
        lastFollowupAt: lastFollowupByStudent.get(student.id) ?? null,
        trialBooking: relevant
          ? {
              id: relevant.id,
              status: relevant.status,
              sessionId: relevant.sessionId,
              sessionStartsAt:
                loadedTrialSessionStartsAt(relevant)?.toISOString() ?? null,
              batchName: loadedTrialBatchName(relevant),
            }
          : null,
      });
    }

    leads.sort((a, b) => {
      const aTime = a.trialBooking?.sessionStartsAt
        ? new Date(a.trialBooking.sessionStartsAt).getTime()
        : Number.POSITIVE_INFINITY;
      const bTime = b.trialBooking?.sessionStartsAt
        ? new Date(b.trialBooking.sessionStartsAt).getTime()
        : Number.POSITIVE_INFINITY;
      if (aTime !== bTime) return aTime - bTime;
      return a.name.localeCompare(b.name);
    });

    return paginateLeads(leads, {
      q: options.q,
      cursor: options.cursor,
      limit: options.limit,
    });
  }

  async createLead(
    studioId: string,
    data: {
      name: string;
      phone: string;
      ageRange: AgeRange;
      sessionId?: string;
    },
  ): Promise<LeadDto> {
    const name = data.name.trim();
    const phone = data.phone.trim();
    if (!name) {
      throw new BadRequestException("Name is required");
    }
    if (!phone) {
      throw new BadRequestException("Mobile number is required");
    }

    let session: {
      id: string;
      batchId: string;
      startsAt: Date;
      endsAt: Date;
      batch: { id: string; name: string; studioId: string; active: boolean };
    } | null = null;

    if (data.sessionId) {
      const found = await this.prisma.session.findUnique({
        where: { id: data.sessionId },
        include: {
          batch: {
            select: { id: true, name: true, studioId: true, active: true },
          },
        },
      });
      if (
        !found ||
        found.status === SessionStatus.CANCELLED ||
        !found.batch.active ||
        found.batch.studioId !== studioId
      ) {
        throw new BadRequestException(
          "Select a trial session from this studio",
        );
      }
      session = found;
    }

    const leadId = randomUUID();
    const email = `lead-${leadId}@noreply.stepup.local`;
    const sealed = this.crypto.sealPii({
      email,
      name,
      phone,
      bio: null,
      instagramUrl: null,
      guardianName: null,
      alternateMobile: null,
    });

    const user = await this.prisma.user.create({
      data: {
        firebaseUid: `staff-created:lead:${leadId}`,
        ...sealed,
        role: UserRole.STUDENT,
        studioId,
        ageRange: data.ageRange,
        styles: [],
        profileVisibility: ProfileVisibility.PRIVATE,
      },
      select: {
        id: true,
        createdAt: true,
        active: true,
        ageRange: true,
        photoUrl: true,
        ...userPiiSelect,
      },
    });

    let trialBooking: LeadDto["trialBooking"] = null;
    if (session) {
      const booking = await this.prisma.booking.create({
        data: {
          studioId,
          studentId: user.id,
          type: BookingType.TRIAL,
          batchId: session.batchId,
          sessionId: session.id,
          status: BookingStatus.PENDING,
          startsAt: session.startsAt,
          endsAt: session.endsAt,
          notes: "Staff quick-add lead — call to confirm",
        },
        select: {
          id: true,
          status: true,
          sessionId: true,
        },
      });
      trialBooking = {
        id: booking.id,
        status: booking.status,
        sessionId: booking.sessionId,
        sessionStartsAt: session.startsAt.toISOString(),
        batchName: session.batch.name,
      };
    }

    const presented = await this.presentUser(user);
    return {
      id: presented.id,
      name: presented.name,
      phone: presented.phone ?? null,
      photoUrl: presented.photoUrl ?? null,
      ageRange: user.ageRange,
      createdAt: user.createdAt.toISOString(),
      active: user.active,
      section: trialBooking ? "trialBooked" : "new",
      lastFollowupAt: null,
      trialBooking,
    };
  }

  async listLeadRemarks(
    studioId: string,
    leadId: string,
  ): Promise<LeadRemarkDto[]> {
    await this.requireStudioStudent(studioId, leadId);
    const remarks = await this.prisma.leadRemark.findMany({
      where: { studioId, studentId: leadId },
      select: {
        id: true,
        body: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            ...userPiiSelect,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return Promise.all(
      remarks.map(async (remark) => {
        const author = await this.presentUser(remark.author);
        return {
          id: remark.id,
          body: remark.body,
          createdAt: remark.createdAt.toISOString(),
          author: { id: author.id, name: author.name },
        };
      }),
    );
  }

  async addLeadRemark(
    studioId: string,
    leadId: string,
    authorId: string,
    body: string,
  ): Promise<LeadRemarkDto> {
    await this.requireStudioStudent(studioId, leadId);
    const trimmed = body.trim();
    if (!trimmed) {
      throw new BadRequestException("Remark cannot be empty");
    }
    if (trimmed.length > LEAD_REMARK_MAX_LENGTH) {
      throw new BadRequestException("Remark is too long");
    }

    const remark = await this.prisma.leadRemark.create({
      data: {
        studioId,
        studentId: leadId,
        authorId,
        body: trimmed,
      },
      select: {
        id: true,
        body: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            ...userPiiSelect,
          },
        },
      },
    });

    const author = await this.presentUser(remark.author);
    return {
      id: remark.id,
      body: remark.body,
      createdAt: remark.createdAt.toISOString(),
      author: { id: author.id, name: author.name },
    };
  }

  private async requireStudioStudent(studioId: string, studentId: string) {
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
    return student;
  }

  async linkStudioFamily(
    studioId: string,
    data: { anchorUserId: string; memberUserIds: string[] },
  ) {
    const memberUserIds = [
      ...new Set(
        data.memberUserIds.filter((id) => id && id !== data.anchorUserId),
      ),
    ];
    if (memberUserIds.length === 0) {
      throw new BadRequestException("Select at least one family member");
    }

    const allIds = [data.anchorUserId, ...memberUserIds];
    const users = await this.prisma.user.findMany({
      where: { id: { in: allIds }, studioId },
      select: {
        id: true,
        role: true,
        studioId: true,
      },
    });

    if (users.length !== allIds.length) {
      throw new NotFoundException(
        "One or more users were not found in this studio",
      );
    }

    for (const user of users) {
      if (user.role !== UserRole.STUDENT && user.role !== UserRole.PARENT) {
        throw new BadRequestException(
          "Only student and parent accounts can be linked into a family",
        );
      }
    }

    const parentOwner = users.find((user) => user.role === UserRole.PARENT);
    const ownerId = parentOwner?.id ?? data.anchorUserId;
    const owner = users.find((user) => user.id === ownerId);
    if (!owner) {
      throw new NotFoundException("Family owner not found in this studio");
    }

    const others = users.filter((user) => user.id !== ownerId);

    await this.prisma.$transaction(async (tx) => {
      for (const member of others) {
        if (
          owner.role === UserRole.PARENT &&
          member.role === UserRole.STUDENT
        ) {
          await tx.parentChild.upsert({
            where: {
              parentUserId_childUserId: {
                parentUserId: ownerId,
                childUserId: member.id,
              },
            },
            update: {},
            create: {
              parentUserId: ownerId,
              childUserId: member.id,
            },
          });
        }

        const kind =
          owner.role === UserRole.PARENT && member.role === UserRole.STUDENT
            ? FamilyMemberKind.KID
            : FamilyMemberKind.CO_STUDENT;

        await tx.familyMember.upsert({
          where: {
            ownerUserId_memberUserId: {
              ownerUserId: ownerId,
              memberUserId: member.id,
            },
          },
          update: { kind },
          create: {
            ownerUserId: ownerId,
            memberUserId: member.id,
            kind,
          },
        });
      }
    });

    return this.listFamilyMembers(ownerId);
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
      dateOfBirth?: string;
      age?: number;
      guardianName?: string;
      alternateMobile?: string;
      ageRange?: AgeRange;
    },
  ) {
    const name = data.name.trim();
    if (!name) {
      throw new BadRequestException("Name is required");
    }
    if (!owner.studioId) {
      throw new BadRequestException("Owner must belong to a studio");
    }

    const ageFields = this.resolveAgeFields(data);
    const dependentId = randomUUID();
    const syntheticEmail = `dependent+${dependentId}@internal.invalid`;
    const sealed = this.crypto.sealPii({
      email: syntheticEmail,
      name,
      phone: null,
      bio: null,
      instagramUrl: null,
      guardianName: data.guardianName?.trim() || null,
      alternateMobile: data.alternateMobile?.trim() || null,
    });

    const member = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          firebaseUid: `dependent:${dependentId}`,
          ...sealed,
          role: UserRole.STUDENT,
          studioId: owner.studioId,
          gender: data.gender,
          ageRange: ageFields.ageRange,
          ...(ageFields.dateOfBirth !== undefined
            ? { dateOfBirth: ageFields.dateOfBirth }
            : {}),
          ...(ageFields.ageYears !== undefined
            ? { ageYears: ageFields.ageYears }
            : {}),
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
