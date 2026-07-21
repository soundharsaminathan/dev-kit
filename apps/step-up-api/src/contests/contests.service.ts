import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  ContestEntryStatus,
  ContestEntryType,
  ContestStatus,
  type Prisma,
  UserRole,
} from "@prisma/client";
import { formatCertificateNumber } from "../certificates/certificate-layout";
import { PrismaService } from "../prisma/prisma.service";
import {
  type DecryptedUser,
  UserCryptoService,
  userPiiSelect,
} from "../users/user-crypto.service";

const JUDGE_ROLES = new Set<UserRole>([UserRole.STAFF, UserRole.TRAINER]);

type CategoryInput = {
  name: string;
  danceStyle: string;
  ageMin: number;
  ageMax: number;
  entryType: ContestEntryType;
  maxEntries?: number | null;
  maxGroupSize?: number | null;
  certificateTemplateId?: string | null;
  judgeIds?: string[];
};

@Injectable()
export class ContestsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(UserCryptoService) private readonly crypto: UserCryptoService,
  ) {}

  private assertStudioAccess(user: DecryptedUser, studioId: string) {
    if (user.studioId !== studioId) {
      throw new ForbiddenException(
        "You can only access contests for your studio",
      );
    }
  }

  private categoryInclude = {
    judges: {
      include: {
        judge: { select: { id: true, role: true, ...userPiiSelect } },
      },
    },
    certificateTemplate: true,
    _count: { select: { entries: true } },
  } satisfies Prisma.ContestCategoryInclude;

  private contestInclude = {
    branch: true,
    certificateTemplate: true,
    categories: {
      include: this.categoryInclude,
      orderBy: { name: "asc" as const },
    },
  } satisfies Prisma.ContestInclude;

  private mapJudge(judge: {
    id: string;
    role: UserRole;
    encryptedKey: string;
    piiCiphertext: string;
    piiIv: string;
  }) {
    const decrypted = this.crypto.decryptUser(judge);
    return {
      id: decrypted.id,
      name: decrypted.name,
      email: decrypted.email,
      role: decrypted.role,
    };
  }

  private mapCategory(
    category: Prisma.ContestCategoryGetPayload<{
      include: typeof ContestsService.prototype.categoryInclude;
    }>,
  ) {
    return {
      ...category,
      judges: category.judges.map((row) => this.mapJudge(row.judge)),
    };
  }

  private mapContest(
    contest: Prisma.ContestGetPayload<{
      include: typeof ContestsService.prototype.contestInclude;
    }>,
  ) {
    return {
      ...contest,
      categories: contest.categories.map((category) =>
        this.mapCategory(category),
      ),
    };
  }

  private validateCategoryInput(data: CategoryInput) {
    if (data.ageMin < 0 || data.ageMax < data.ageMin) {
      throw new BadRequestException("Invalid age range for category");
    }
    if (data.entryType === ContestEntryType.GROUP) {
      const maxGroupSize = data.maxGroupSize ?? null;
      if (maxGroupSize !== null && maxGroupSize < 2) {
        throw new BadRequestException(
          "Group categories need maxGroupSize of at least 2",
        );
      }
    }
    if (
      data.maxEntries !== undefined &&
      data.maxEntries !== null &&
      data.maxEntries < 1
    ) {
      throw new BadRequestException("maxEntries must be at least 1");
    }
  }

  private async assertCertificateTemplate(
    studioId: string,
    templateId: string | null | undefined,
  ) {
    if (!templateId) {
      return null;
    }
    const template = await this.prisma.certificateTemplate.findUnique({
      where: { id: templateId },
    });
    if (!template || template.studioId !== studioId) {
      throw new BadRequestException(
        "Select a certificate template from this studio",
      );
    }
    return template;
  }

  private async assertJudges(studioId: string, judgeIds: string[]) {
    const unique = [...new Set(judgeIds)];
    if (unique.length === 0) {
      return;
    }
    const judges = await this.prisma.user.findMany({
      where: { id: { in: unique }, studioId },
    });
    if (judges.length !== unique.length) {
      throw new BadRequestException(
        "All judges must be members of this studio",
      );
    }
    for (const judge of judges) {
      if (!JUDGE_ROLES.has(judge.role)) {
        throw new BadRequestException(
          "Judges must be studio staff or trainers",
        );
      }
    }
  }

  private assertRegistrationOpen(contest: {
    status: ContestStatus;
    registrationOpensAt: Date | null;
    registrationClosesAt: Date | null;
  }) {
    if (contest.status !== ContestStatus.OPEN) {
      throw new BadRequestException(
        "Registration is only open for OPEN contests",
      );
    }
    const now = new Date();
    if (contest.registrationOpensAt && now < contest.registrationOpensAt) {
      throw new BadRequestException("Registration has not opened yet");
    }
    if (contest.registrationClosesAt && now > contest.registrationClosesAt) {
      throw new BadRequestException("Registration has closed");
    }
  }

  async listByStudio(user: DecryptedUser, studioId: string) {
    this.assertStudioAccess(user, studioId);
    const contests = await this.prisma.contest.findMany({
      where: { studioId },
      include: this.contestInclude,
      orderBy: [{ startsAt: "desc" }, { title: "asc" }],
    });
    return contests.map((contest) => this.mapContest(contest));
  }

  async getById(user: DecryptedUser, id: string) {
    const contest = await this.prisma.contest.findUnique({
      where: { id },
      include: this.contestInclude,
    });
    if (!contest) {
      throw new NotFoundException("Contest not found");
    }
    this.assertStudioAccess(user, contest.studioId);
    return this.mapContest(contest);
  }

  async create(
    user: DecryptedUser,
    data: {
      studioId: string;
      branchId?: string | null;
      title: string;
      description?: string | null;
      startsAt: string;
      endsAt: string;
      registrationOpensAt?: string | null;
      registrationClosesAt?: string | null;
      status?: ContestStatus;
      certificationEnabled?: boolean;
      certificateTemplateId?: string | null;
      categories?: CategoryInput[];
    },
  ) {
    this.assertStudioAccess(user, data.studioId);
    const startsAt = new Date(data.startsAt);
    const endsAt = new Date(data.endsAt);
    if (!(startsAt < endsAt)) {
      throw new BadRequestException("Contest endsAt must be after startsAt");
    }

    if (data.branchId) {
      const branch = await this.prisma.studioBranch.findUnique({
        where: { id: data.branchId },
      });
      if (!branch || branch.studioId !== data.studioId) {
        throw new BadRequestException("Select a branch from this studio");
      }
    }

    const certificationEnabled = data.certificationEnabled ?? false;
    const certificateTemplateId = certificationEnabled
      ? data.certificateTemplateId
      : null;
    if (certificationEnabled && !certificateTemplateId) {
      throw new BadRequestException(
        "Select a certificate template from this studio",
      );
    }
    await this.assertCertificateTemplate(data.studioId, certificateTemplateId);

    const categories = data.categories ?? [];
    for (const category of categories) {
      this.validateCategoryInput(category);
      await this.assertCertificateTemplate(
        data.studioId,
        category.certificateTemplateId,
      );
      await this.assertJudges(data.studioId, category.judgeIds ?? []);
    }

    const contest = await this.prisma.contest.create({
      data: {
        studioId: data.studioId,
        branchId: data.branchId ?? null,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        startsAt,
        endsAt,
        registrationOpensAt: data.registrationOpensAt
          ? new Date(data.registrationOpensAt)
          : null,
        registrationClosesAt: data.registrationClosesAt
          ? new Date(data.registrationClosesAt)
          : null,
        status: data.status ?? ContestStatus.DRAFT,
        creatorId: user.id,
        certificationEnabled,
        certificateTemplateId: certificateTemplateId ?? null,
        categories: {
          create: categories.map((category) => ({
            name: category.name.trim(),
            danceStyle: category.danceStyle.trim(),
            ageMin: category.ageMin,
            ageMax: category.ageMax,
            entryType: category.entryType,
            maxEntries: category.maxEntries ?? null,
            maxGroupSize:
              category.entryType === ContestEntryType.GROUP
                ? (category.maxGroupSize ?? null)
                : null,
            certificateTemplateId: category.certificateTemplateId ?? null,
            judges: {
              create: (category.judgeIds ?? []).map((judgeId) => ({
                judgeId,
              })),
            },
          })),
        },
      },
      include: this.contestInclude,
    });

    return this.mapContest(contest);
  }

  async update(
    user: DecryptedUser,
    id: string,
    data: {
      title?: string;
      description?: string | null;
      branchId?: string | null;
      startsAt?: string;
      endsAt?: string;
      registrationOpensAt?: string | null;
      registrationClosesAt?: string | null;
      status?: ContestStatus;
      certificationEnabled?: boolean;
      certificateTemplateId?: string | null;
    },
  ) {
    const existing = await this.prisma.contest.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Contest not found");
    }
    this.assertStudioAccess(user, existing.studioId);

    const startsAt = data.startsAt
      ? new Date(data.startsAt)
      : existing.startsAt;
    const endsAt = data.endsAt ? new Date(data.endsAt) : existing.endsAt;
    if (!(startsAt < endsAt)) {
      throw new BadRequestException("Contest endsAt must be after startsAt");
    }

    if (data.branchId) {
      const branch = await this.prisma.studioBranch.findUnique({
        where: { id: data.branchId },
      });
      if (!branch || branch.studioId !== existing.studioId) {
        throw new BadRequestException("Select a branch from this studio");
      }
    }

    const certificationEnabled =
      data.certificationEnabled ?? existing.certificationEnabled;
    let certificateTemplateId =
      data.certificateTemplateId === undefined
        ? existing.certificateTemplateId
        : data.certificateTemplateId;
    if (!certificationEnabled) {
      certificateTemplateId = null;
    } else if (!certificateTemplateId) {
      throw new BadRequestException(
        "Select a certificate template from this studio",
      );
    }
    await this.assertCertificateTemplate(
      existing.studioId,
      certificateTemplateId,
    );

    const contest = await this.prisma.contest.update({
      where: { id },
      data: {
        title: data.title?.trim(),
        description:
          data.description === undefined
            ? undefined
            : data.description?.trim() || null,
        branchId: data.branchId === undefined ? undefined : data.branchId,
        startsAt: data.startsAt ? startsAt : undefined,
        endsAt: data.endsAt ? endsAt : undefined,
        registrationOpensAt:
          data.registrationOpensAt === undefined
            ? undefined
            : data.registrationOpensAt
              ? new Date(data.registrationOpensAt)
              : null,
        registrationClosesAt:
          data.registrationClosesAt === undefined
            ? undefined
            : data.registrationClosesAt
              ? new Date(data.registrationClosesAt)
              : null,
        status: data.status,
        certificationEnabled,
        certificateTemplateId,
      },
      include: this.contestInclude,
    });

    return this.mapContest(contest);
  }

  async remove(user: DecryptedUser, id: string) {
    const existing = await this.prisma.contest.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Contest not found");
    }
    this.assertStudioAccess(user, existing.studioId);
    await this.prisma.contest.delete({ where: { id } });
    return { ok: true };
  }

  async addCategory(
    user: DecryptedUser,
    contestId: string,
    data: CategoryInput,
  ) {
    const contest = await this.prisma.contest.findUnique({
      where: { id: contestId },
    });
    if (!contest) {
      throw new NotFoundException("Contest not found");
    }
    this.assertStudioAccess(user, contest.studioId);
    this.validateCategoryInput(data);
    await this.assertCertificateTemplate(
      contest.studioId,
      data.certificateTemplateId,
    );
    await this.assertJudges(contest.studioId, data.judgeIds ?? []);

    const category = await this.prisma.contestCategory.create({
      data: {
        contestId,
        name: data.name.trim(),
        danceStyle: data.danceStyle.trim(),
        ageMin: data.ageMin,
        ageMax: data.ageMax,
        entryType: data.entryType,
        maxEntries: data.maxEntries ?? null,
        maxGroupSize:
          data.entryType === ContestEntryType.GROUP
            ? (data.maxGroupSize ?? null)
            : null,
        certificateTemplateId: data.certificateTemplateId ?? null,
        judges: {
          create: (data.judgeIds ?? []).map((judgeId) => ({ judgeId })),
        },
      },
      include: this.categoryInclude,
    });

    return this.mapCategory(category);
  }

  async updateCategory(
    user: DecryptedUser,
    contestId: string,
    categoryId: string,
    data: Partial<CategoryInput>,
  ) {
    const category = await this.prisma.contestCategory.findUnique({
      where: { id: categoryId },
      include: { contest: true },
    });
    if (!category || category.contestId !== contestId) {
      throw new NotFoundException("Category not found");
    }
    this.assertStudioAccess(user, category.contest.studioId);

    const next: CategoryInput = {
      name: data.name ?? category.name,
      danceStyle: data.danceStyle ?? category.danceStyle,
      ageMin: data.ageMin ?? category.ageMin,
      ageMax: data.ageMax ?? category.ageMax,
      entryType: data.entryType ?? category.entryType,
      maxEntries:
        data.maxEntries === undefined ? category.maxEntries : data.maxEntries,
      maxGroupSize:
        data.maxGroupSize === undefined
          ? category.maxGroupSize
          : data.maxGroupSize,
      certificateTemplateId:
        data.certificateTemplateId === undefined
          ? category.certificateTemplateId
          : data.certificateTemplateId,
    };
    this.validateCategoryInput(next);
    await this.assertCertificateTemplate(
      category.contest.studioId,
      next.certificateTemplateId,
    );

    const updated = await this.prisma.contestCategory.update({
      where: { id: categoryId },
      data: {
        name: next.name.trim(),
        danceStyle: next.danceStyle.trim(),
        ageMin: next.ageMin,
        ageMax: next.ageMax,
        entryType: next.entryType,
        maxEntries: next.maxEntries ?? null,
        maxGroupSize:
          next.entryType === ContestEntryType.GROUP
            ? (next.maxGroupSize ?? null)
            : null,
        certificateTemplateId: next.certificateTemplateId ?? null,
      },
      include: this.categoryInclude,
    });

    return this.mapCategory(updated);
  }

  async removeCategory(
    user: DecryptedUser,
    contestId: string,
    categoryId: string,
  ) {
    const category = await this.prisma.contestCategory.findUnique({
      where: { id: categoryId },
      include: { contest: true },
    });
    if (!category || category.contestId !== contestId) {
      throw new NotFoundException("Category not found");
    }
    this.assertStudioAccess(user, category.contest.studioId);
    await this.prisma.contestCategory.delete({ where: { id: categoryId } });
    return { ok: true };
  }

  async setJudges(user: DecryptedUser, categoryId: string, judgeIds: string[]) {
    const category = await this.prisma.contestCategory.findUnique({
      where: { id: categoryId },
      include: { contest: true },
    });
    if (!category) {
      throw new NotFoundException("Category not found");
    }
    this.assertStudioAccess(user, category.contest.studioId);
    const unique = [...new Set(judgeIds)];
    await this.assertJudges(category.contest.studioId, unique);

    await this.prisma.$transaction([
      this.prisma.contestJudge.deleteMany({ where: { categoryId } }),
      this.prisma.contestJudge.createMany({
        data: unique.map((judgeId) => ({ categoryId, judgeId })),
      }),
    ]);

    const refreshed = await this.prisma.contestCategory.findUniqueOrThrow({
      where: { id: categoryId },
      include: this.categoryInclude,
    });
    return this.mapCategory(refreshed);
  }

  async listEntries(
    user: DecryptedUser,
    contestId: string,
    categoryId?: string,
  ) {
    const contest = await this.prisma.contest.findUnique({
      where: { id: contestId },
    });
    if (!contest) {
      throw new NotFoundException("Contest not found");
    }
    this.assertStudioAccess(user, contest.studioId);

    const entries = await this.prisma.contestEntry.findMany({
      where: {
        category: { contestId },
        ...(categoryId ? { categoryId } : {}),
      },
      include: {
        category: true,
        certificate: true,
        members: {
          include: {
            student: { select: { id: true, role: true, ...userPiiSelect } },
          },
        },
      },
      orderBy: [{ placement: "asc" }, { createdAt: "asc" }],
    });

    return entries.map((entry) => ({
      ...entry,
      members: entry.members.map((member) => {
        const student = this.crypto.decryptUser(member.student);
        return {
          studentId: student.id,
          name: student.name,
          email: student.email,
        };
      }),
    }));
  }

  private mapScore(score: {
    id: string;
    entryId: string;
    judgeId: string;
    score: number;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    judge?: {
      id: string;
      role: UserRole;
      encryptedKey: string;
      piiCiphertext: string;
      piiIv: string;
    };
  }) {
    const judge = score.judge ? this.mapJudge(score.judge) : undefined;
    return {
      id: score.id,
      entryId: score.entryId,
      judgeId: score.judgeId,
      score: score.score,
      notes: score.notes,
      createdAt: score.createdAt,
      updatedAt: score.updatedAt,
      ...(judge ? { judge } : {}),
    };
  }

  private isContestManager(user: DecryptedUser) {
    return user.role === UserRole.OWNER || user.role === UserRole.STAFF;
  }

  async listScores(user: DecryptedUser, contestId: string) {
    const contest = await this.prisma.contest.findUnique({
      where: { id: contestId },
    });
    if (!contest) {
      throw new NotFoundException("Contest not found");
    }
    this.assertStudioAccess(user, contest.studioId);

    const isManager = this.isContestManager(user);
    const scores = await this.prisma.contestScore.findMany({
      where: {
        entry: { category: { contestId } },
        ...(isManager ? {} : { judgeId: user.id }),
      },
      include: isManager
        ? {
            judge: { select: { id: true, role: true, ...userPiiSelect } },
          }
        : undefined,
      orderBy: [{ updatedAt: "desc" }],
    });

    return scores.map((score) => this.mapScore(score));
  }

  async upsertScore(
    user: DecryptedUser,
    entryId: string,
    data: { score: number; notes?: string | null },
  ) {
    const entry = await this.prisma.contestEntry.findUnique({
      where: { id: entryId },
      include: {
        category: {
          include: {
            contest: true,
            judges: true,
          },
        },
      },
    });
    if (!entry) {
      throw new NotFoundException("Entry not found");
    }
    this.assertStudioAccess(user, entry.category.contest.studioId);

    const isAssigned = entry.category.judges.some(
      (row) => row.judgeId === user.id,
    );
    if (!isAssigned) {
      throw new ForbiddenException(
        "You are not assigned as a judge for this category",
      );
    }

    const status = entry.category.contest.status;
    if (status !== ContestStatus.OPEN && status !== ContestStatus.CLOSED) {
      throw new BadRequestException(
        "Scoring is only available while the contest is open or closed",
      );
    }

    if (entry.status === ContestEntryStatus.WITHDRAWN) {
      throw new BadRequestException("Cannot score a withdrawn entry");
    }

    if (!Number.isInteger(data.score) || data.score < 0 || data.score > 100) {
      throw new BadRequestException("Score must be an integer from 0 to 100");
    }

    const notes =
      data.notes === undefined
        ? undefined
        : data.notes === null
          ? null
          : data.notes.trim() || null;

    const score = await this.prisma.contestScore.upsert({
      where: {
        entryId_judgeId: { entryId, judgeId: user.id },
      },
      create: {
        entryId,
        judgeId: user.id,
        score: data.score,
        notes: notes ?? null,
      },
      update: {
        score: data.score,
        ...(notes !== undefined ? { notes } : {}),
      },
    });

    return this.mapScore(score);
  }

  private async assertCanRegisterStudents(
    user: DecryptedUser,
    studioId: string,
    studentIds: string[],
  ) {
    const unique = [...new Set(studentIds)];
    const students = await this.prisma.user.findMany({
      where: { id: { in: unique }, studioId, role: UserRole.STUDENT },
    });
    if (students.length !== unique.length) {
      throw new BadRequestException(
        "All participants must be students in this studio",
      );
    }

    if (user.role === UserRole.STUDENT) {
      if (unique.length !== 1 || unique[0] !== user.id) {
        // Group: student may include teammates who are also studio students
        if (!unique.includes(user.id)) {
          throw new ForbiddenException(
            "Students must include themselves in the entry",
          );
        }
      }
      return unique;
    }

    if (user.role === UserRole.PARENT) {
      const links = await this.prisma.parentChild.findMany({
        where: { parentUserId: user.id, childUserId: { in: unique } },
      });
      if (links.length !== unique.length) {
        throw new ForbiddenException(
          "Parents can only register their linked children",
        );
      }
      return unique;
    }

    throw new ForbiddenException("Only students or parents can register");
  }

  async register(
    user: DecryptedUser,
    categoryId: string,
    data: { studentIds: string[]; teamName?: string | null },
  ) {
    const category = await this.prisma.contestCategory.findUnique({
      where: { id: categoryId },
      include: {
        contest: true,
      },
    });
    if (!category) {
      throw new NotFoundException("Category not found");
    }
    this.assertStudioAccess(user, category.contest.studioId);
    this.assertRegistrationOpen(category.contest);

    const studentIds = await this.assertCanRegisterStudents(
      user,
      category.contest.studioId,
      data.studentIds,
    );

    // Age is labeled on the category; DOB is not stored on users yet, so we do not hard-enforce age here.
    if (category.entryType === ContestEntryType.INDIVIDUAL) {
      if (studentIds.length !== 1) {
        throw new BadRequestException(
          "Individual categories require exactly one student",
        );
      }
      if (data.teamName) {
        throw new BadRequestException(
          "Individual entries cannot have a team name",
        );
      }
    } else {
      const teamName = data.teamName?.trim();
      if (!teamName) {
        throw new BadRequestException("Group entries require a team name");
      }
      if (studentIds.length < 2) {
        throw new BadRequestException(
          "Group entries require at least two students",
        );
      }
      if (
        category.maxGroupSize !== null &&
        studentIds.length > category.maxGroupSize
      ) {
        throw new BadRequestException(
          `Group size cannot exceed ${category.maxGroupSize}`,
        );
      }
    }

    if (category.maxEntries !== null) {
      const activeEntries = await this.prisma.contestEntry.count({
        where: {
          categoryId,
          status: { not: ContestEntryStatus.WITHDRAWN },
        },
      });
      if (activeEntries >= category.maxEntries) {
        throw new BadRequestException("This category is full");
      }
    }

    const alreadyEntered = await this.prisma.contestEntryMember.findFirst({
      where: {
        studentId: { in: studentIds },
        entry: {
          categoryId,
          status: { not: ContestEntryStatus.WITHDRAWN },
        },
      },
    });
    if (alreadyEntered) {
      throw new ConflictException(
        "One or more students are already entered in this category",
      );
    }

    const entry = await this.prisma.contestEntry.create({
      data: {
        categoryId,
        teamName:
          category.entryType === ContestEntryType.GROUP
            ? data.teamName!.trim()
            : null,
        status: ContestEntryStatus.CONFIRMED,
        registeredById: user.id,
        members: {
          create: studentIds.map((studentId) => ({ studentId })),
        },
      },
      include: {
        category: true,
        certificate: true,
        members: {
          include: {
            student: { select: { id: true, role: true, ...userPiiSelect } },
          },
        },
      },
    });

    return {
      ...entry,
      members: entry.members.map((member) => {
        const student = this.crypto.decryptUser(member.student);
        return {
          studentId: student.id,
          name: student.name,
          email: student.email,
        };
      }),
    };
  }

  async updateEntry(
    user: DecryptedUser,
    entryId: string,
    data: { status?: ContestEntryStatus; placement?: number | null },
  ) {
    const entry = await this.prisma.contestEntry.findUnique({
      where: { id: entryId },
      include: { category: { include: { contest: true } } },
    });
    if (!entry) {
      throw new NotFoundException("Entry not found");
    }
    this.assertStudioAccess(user, entry.category.contest.studioId);

    if (data.placement !== undefined && data.placement !== null) {
      if (!Number.isInteger(data.placement) || data.placement < 1) {
        throw new BadRequestException("Placement must be a positive integer");
      }
    }

    const updated = await this.prisma.contestEntry.update({
      where: { id: entryId },
      data: {
        status: data.status,
        placement: data.placement === undefined ? undefined : data.placement,
      },
      include: {
        category: true,
        certificate: true,
        members: {
          include: {
            student: { select: { id: true, role: true, ...userPiiSelect } },
          },
        },
      },
    });

    return {
      ...updated,
      members: updated.members.map((member) => {
        const student = this.crypto.decryptUser(member.student);
        return {
          studentId: student.id,
          name: student.name,
          email: student.email,
        };
      }),
    };
  }

  async withdraw(user: DecryptedUser, entryId: string) {
    const entry = await this.prisma.contestEntry.findUnique({
      where: { id: entryId },
      include: {
        category: { include: { contest: true } },
        members: true,
      },
    });
    if (!entry) {
      throw new NotFoundException("Entry not found");
    }
    this.assertStudioAccess(user, entry.category.contest.studioId);

    const isStaff =
      user.role === UserRole.OWNER || user.role === UserRole.STAFF;
    const isRegistrar = entry.registeredById === user.id;
    const isMember = entry.members.some((m) => m.studentId === user.id);

    if (!isStaff && !isRegistrar && !isMember) {
      if (user.role === UserRole.PARENT) {
        const childIds = entry.members.map((m) => m.studentId);
        const link = await this.prisma.parentChild.findFirst({
          where: {
            parentUserId: user.id,
            childUserId: { in: childIds },
          },
        });
        if (!link) {
          throw new ForbiddenException("You cannot withdraw this entry");
        }
      } else {
        throw new ForbiddenException("You cannot withdraw this entry");
      }
    }

    return this.prisma.contestEntry.update({
      where: { id: entryId },
      data: { status: ContestEntryStatus.WITHDRAWN, placement: null },
    });
  }

  async issueCertificate(user: DecryptedUser, entryId: string) {
    const entry = await this.prisma.contestEntry.findUnique({
      where: { id: entryId },
      include: {
        certificate: true,
        category: {
          include: {
            contest: true,
            certificateTemplate: true,
          },
        },
      },
    });
    if (!entry) {
      throw new NotFoundException("Entry not found");
    }
    this.assertStudioAccess(user, entry.category.contest.studioId);

    if (entry.status === ContestEntryStatus.WITHDRAWN) {
      throw new BadRequestException(
        "Cannot issue a certificate for a withdrawn entry",
      );
    }
    if (entry.certificate) {
      throw new ConflictException("Certificate already issued for this entry");
    }
    if (!entry.category.contest.certificationEnabled) {
      throw new BadRequestException(
        "Certificates are not enabled for this contest",
      );
    }

    const templateId =
      entry.category.certificateTemplateId ??
      entry.category.contest.certificateTemplateId;
    if (!templateId) {
      throw new BadRequestException(
        "Select a certificate template from this studio",
      );
    }

    const template = await this.assertCertificateTemplate(
      entry.category.contest.studioId,
      templateId,
    );
    if (!template) {
      throw new BadRequestException(
        "Select a certificate template from this studio",
      );
    }

    const year = new Date().getFullYear();
    const issuedThisYear = await this.prisma.contestCertificate.count({
      where: {
        issuedAt: {
          gte: new Date(`${year}-01-01T00:00:00.000Z`),
          lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
        },
        entry: {
          category: {
            contest: { studioId: entry.category.contest.studioId },
          },
        },
      },
    });
    const certificateNumber = formatCertificateNumber(
      year,
      issuedThisYear + 1,
      entry.category.contest.studioId,
    );

    return this.prisma.contestCertificate.create({
      data: {
        entryId,
        templateId: template.id,
        issuedById: user.id,
        certificateNumber,
        layoutSnapshot: {
          layout: template.layoutJson,
          bindings: {
            certificate_id: certificateNumber,
          },
        } as Prisma.InputJsonValue,
      },
      include: { template: true },
    });
  }
}
