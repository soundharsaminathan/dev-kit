import { randomUUID } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AttendanceStatus,
  type ExperienceLevel,
  ProfileVisibility,
  UserRole,
} from "@prisma/client";
import { MediaService } from "../media/media.service";
import { PrismaService } from "../prisma/prisma.service";
import { isAlwaysPublicRole } from "../social/visibility";
import {
  type DecryptedUser,
  type EncryptedUserFields,
  UserCryptoService,
  type UserPii,
  userPiiSelect,
} from "./user-crypto.service";

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
      },
      select: {
        id: true,
        ...userPiiSelect,
        role: true,
        photoUrl: true,
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
    phone?: string;
    styles?: string[];
  }) {
    return this.createStudioMember({
      ...data,
      role: UserRole.STUDENT,
    });
  }

  async createTrainer(data: {
    studioId: string;
    name: string;
    email: string;
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
      },
    });

    if (!student) {
      throw new NotFoundException("Student not found in this studio");
    }

    const [enrollments, subscriptions, attendanceRecords, invoices] =
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
        this.prisma.subscription.findMany({
          where: {
            studentId,
            plan: { studioId },
          },
          include: { plan: true },
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
      subscriptions,
      attendance,
      invoices: invoices.map((invoice) => ({
        ...invoice,
        amount: Number(invoice.amount),
      })),
    };
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
      email?: string;
      phone?: string;
      bio?: string;
      photoUrl?: string;
      bannerUrl?: string;
      coverUrl?: string;
      instagramUrl?: string;
      styles?: string[];
      experienceLevel?: ExperienceLevel;
      scheduleVibe?: string[];
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
      data.email !== undefined ||
      data.phone !== undefined ||
      data.bio !== undefined ||
      data.instagramUrl !== undefined;

    const pii: UserPii = {
      email: data.email ?? current.email,
      name: data.name ?? current.name,
      phone: data.phone !== undefined ? data.phone || null : current.phone,
      bio: data.bio !== undefined ? data.bio || null : current.bio,
      instagramUrl:
        data.instagramUrl !== undefined
          ? data.instagramUrl || null
          : current.instagramUrl,
    };

    const { profileVisibility, styles, experienceLevel, scheduleVibe } = data;
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

  async completeOnboarding(id: string) {
    const existing = await this.prisma.user.findUniqueOrThrow({
      where: { id },
    });
    const current = this.crypto.decryptUser(existing);
    const missing: string[] = [];

    if (!current.name?.trim() || current.name.trim() === "New User") {
      missing.push("name");
    }
    if ((current.styles ?? []).length < 1) {
      missing.push("styles");
    }
    if (!current.experienceLevel) {
      missing.push("experienceLevel");
    }
    if ((current.scheduleVibe ?? []).length < 1) {
      missing.push("scheduleVibe");
    }
    if (!current.preferredBranchId) {
      missing.push("preferredBranchId");
    }

    if (missing.length > 0) {
      throw new BadRequestException(
        `Onboarding incomplete: missing ${missing.join(", ")}`,
      );
    }

    if (current.onboardingCompletedAt) {
      return this.presentUser(existing);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { onboardingCompletedAt: new Date() },
    });

    return this.presentUser(updated);
  }

  async linkParentChild(parentUserId: string, childUserId: string) {
    const [parent, child] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: parentUserId } }),
      this.prisma.user.findUnique({ where: { id: childUserId } }),
    ]);

    if (!parent || !child) {
      throw new NotFoundException("Parent or child user not found");
    }

    return this.prisma.parentChild.upsert({
      where: {
        parentUserId_childUserId: { parentUserId, childUserId },
      },
      update: {},
      create: { parentUserId, childUserId },
    });
  }
}

export type { DecryptedUser };
