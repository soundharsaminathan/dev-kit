import { randomBytes, randomUUID } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, StudioStatus, UserRole } from "@prisma/client";
import { FirebaseService } from "../auth/firebase.service";
import { MediaService } from "../media/media.service";
import { RazorpayService } from "../payments/razorpay.service";
import { PrismaService } from "../prisma/prisma.service";
import { UserCryptoService } from "../users/user-crypto.service";
import { isValidIanaTimeZone } from "../common/zoned-local-time";
import { slugifyStudioName, uniquifySlug } from "../tenancy/studio-slug";
import { getStudioUsageSummaries } from "../studio-invoices/studio-usage";
import { parseDanceStyles } from "./dance-styles";

export type CreateStudioInput = {
  name: string;
  address?: string;
  contact?: string;
  ownerEmail: string;
  ownerName?: string;
  temporaryPassword?: string;
};

function generateTemporaryPassword() {
  return `Su-${randomBytes(6).toString("base64url")}`;
}

function isPlaceholderFirebaseUid(firebaseUid: string) {
  return (
    firebaseUid.startsWith("provisioned:") ||
    firebaseUid.startsWith("staff-created:") ||
    firebaseUid.startsWith("dev-")
  );
}

@Injectable()
export class StudiosService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(UserCryptoService) private readonly crypto: UserCryptoService,
    @Inject(MediaService) private readonly media: MediaService,
    @Inject(RazorpayService) private readonly razorpay: RazorpayService,
    @Inject(FirebaseService) private readonly firebase: FirebaseService,
  ) {}

  async listStudios() {
    const studios = await this.prisma.studio.findMany({
      orderBy: { name: "asc" },
      include: {
        owner: true,
        _count: { select: { members: true } },
      },
    });

    const usageByStudio = await getStudioUsageSummaries(
      this.prisma,
      studios.map((studio) => studio.id),
    );

    return Promise.all(
      studios.map(async (studio) => {
        const owner = this.crypto.decryptUser(studio.owner);
        const usage = usageByStudio.get(studio.id);
        return {
          id: studio.id,
          slug: studio.slug,
          name: studio.name,
          address: studio.address,
          contact: studio.contact,
          logoUrl: await this.media.signReadUrl(studio.logoUrl),
          memberCount: studio._count.members,
          activeStudents: usage?.activeStudents ?? 0,
          trainers: usage?.trainers ?? 0,
          sessionsThisMonth: usage?.sessionsThisMonth ?? 0,
          owner: {
            id: owner.id,
            email: owner.email,
            name: owner.name,
          },
        };
      }),
    );
  }

  async listDirectory() {
    return this.prisma.studio.findMany({
      where: { status: StudioStatus.ACTIVE },
      orderBy: { name: "asc" },
      select: { id: true, slug: true, name: true },
    });
  }

  async createStudio(data: CreateStudioInput) {
    const name = data.name.trim();
    if (!name) {
      throw new BadRequestException("Studio name is required");
    }

    const ownerEmail = data.ownerEmail.trim().toLowerCase();
    if (!ownerEmail) {
      throw new BadRequestException("Owner email is required");
    }

    const ownerName = (data.ownerName?.trim() || "Studio Owner").slice(0, 120);
    const emailHash = this.crypto.hashEmail(ownerEmail);
    const temporaryPassword =
      data.temporaryPassword?.trim() || generateTemporaryPassword();
    if (temporaryPassword.length < 8) {
      throw new BadRequestException(
        "Temporary password must be at least 8 characters",
      );
    }

    const existing = await this.prisma.user.findFirst({
      where: { emailHash },
      include: { ownedStudio: true },
    });

    if (existing) {
      if (existing.role === UserRole.SYSTEM_ADMIN) {
        throw new ConflictException(
          "System admins cannot be assigned as studio owners",
        );
      }
      if (existing.ownedStudio) {
        throw new ConflictException("This user already owns a studio");
      }
      if (existing.studioId) {
        throw new ConflictException(
          "This user is already a member of another studio",
        );
      }
    }

    const issueTempPassword =
      !existing || isPlaceholderFirebaseUid(existing.firebaseUid);

    const result = await this.prisma.$transaction(async (tx) => {
      let ownerId: string;
      let ownerProvisioned = false;

      if (existing) {
        ownerId = existing.id;
        await tx.user.update({
          where: { id: ownerId },
          data: {
            role: UserRole.OWNER,
            ...(issueTempPassword ? { mustChangePassword: true } : {}),
          },
        });
      } else {
        const sealed = this.crypto.sealPii({
          email: ownerEmail,
          name: ownerName,
          phone: null,
          bio: null,
          instagramUrl: null,
          guardianName: null,
          alternateMobile: null,
        });
        const owner = await tx.user.create({
          data: {
            firebaseUid: `provisioned:${randomUUID()}`,
            ...sealed,
            role: UserRole.OWNER,
            styles: [],
            mustChangePassword: true,
          },
        });
        ownerId = owner.id;
        ownerProvisioned = true;
      }

      const existingSlugs = await tx.studio.findMany({
        select: { slug: true },
      });
      const taken = new Set(existingSlugs.map((row) => row.slug));
      const slug = uniquifySlug(slugifyStudioName(name), taken);

      const studio = await tx.studio.create({
        data: {
          name,
          slug,
          status: StudioStatus.ACTIVE,
          address: data.address?.trim() || null,
          contact: data.contact?.trim() || null,
          photos: [],
          ownerId,
          settings: {
            create: {},
          },
        },
      });

      const features = await tx.feature.findMany({ select: { id: true } });
      if (features.length > 0) {
        await tx.studioFeature.createMany({
          data: features.map((feature) => ({
            studioId: studio.id,
            featureId: feature.id,
            enabled: true,
          })),
        });
      }

      await tx.user.update({
        where: { id: ownerId },
        data: { studioId: studio.id, role: UserRole.OWNER },
      });

      const owner = await tx.user.findUniqueOrThrow({ where: { id: ownerId } });

      return { studio, owner, ownerProvisioned };
    });

    if (issueTempPassword) {
      try {
        const firebaseUser = await this.firebase.ensureEmailPasswordUser({
          email: ownerEmail,
          password: temporaryPassword,
          displayName: ownerName,
        });
        if (firebaseUser) {
          const conflict = await this.prisma.user.findFirst({
            where: {
              firebaseUid: firebaseUser.uid,
              id: { not: result.owner.id },
            },
            select: { id: true },
          });
          if (conflict) {
            throw new ConflictException(
              "A Firebase account for this email is already linked to another user",
            );
          }
          await this.prisma.user.update({
            where: { id: result.owner.id },
            data: { firebaseUid: firebaseUser.uid },
          });
        }
      } catch (error) {
        if (error instanceof ConflictException) {
          throw error;
        }
      }
    }

    const owner = this.crypto.decryptUser(result.owner);
    const returnedPassword = issueTempPassword ? temporaryPassword : null;

    return {
      id: result.studio.id,
      slug: result.studio.slug,
      name: result.studio.name,
      address: result.studio.address,
      contact: result.studio.contact,
      owner: {
        id: owner.id,
        email: owner.email,
        name: owner.name,
      },
      ownerProvisioned: result.ownerProvisioned,
      temporaryPassword: returnedPassword,
      setupHint: returnedPassword
        ? `Share this temporary password with ${owner.email}. They must change it on first login.`
        : null,
    };
  }

  async getPublicProfile(id: string) {
    const studio = await this.prisma.studio.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        status: StudioStatus.ACTIVE,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        address: true,
        contact: true,
        photos: true,
        logoUrl: true,
        heroMobileUrl: true,
        heroDesktopUrl: true,
      },
    });

    if (!studio) {
      throw new NotFoundException("Studio not found");
    }

    return {
      ...studio,
      logoUrl: await this.media.signReadUrl(studio.logoUrl),
      heroMobileUrl: await this.media.signReadUrl(studio.heroMobileUrl),
      heroDesktopUrl: await this.media.signReadUrl(studio.heroDesktopUrl),
    };
  }

  async getStudio(id: string) {
    const studio = await this.prisma.studio.findUnique({
      where: { id },
      include: { settings: true, owner: true },
    });

    if (!studio) {
      throw new NotFoundException("Studio not found");
    }

    const settings = studio.settings
      ? {
          graceDays: studio.settings.graceDays,
          expireAlertDays: studio.settings.expireAlertDays,
          platformFeePercent: studio.settings.platformFeePercent,
          gstPercent: studio.settings.gstPercent,
          admissionFee: Number(studio.settings.admissionFee),
          timezone: studio.settings.timezone,
          razorpayKeyId: studio.settings.razorpayKeyId,
          razorpayConfigured: Boolean(
            studio.settings.razorpayKeyId &&
              studio.settings.razorpayKeySecret &&
              studio.settings.razorpaySecretIv,
          ),
          danceStyles: studio.settings.danceStyles ?? null,
          gstNumber: studio.settings.gstNumber ?? null,
        }
      : null;

    return {
      ...studio,
      logoUrl: await this.media.signReadUrl(studio.logoUrl),
      heroMobileUrl: await this.media.signReadUrl(studio.heroMobileUrl),
      heroDesktopUrl: await this.media.signReadUrl(studio.heroDesktopUrl),
      settings,
      owner: this.crypto.decryptUser(studio.owner),
    };
  }

  updateStudio(
    id: string,
    data: {
      name?: string;
      address?: string;
      contact?: string;
      logoUrl?: string | null;
      heroMobileUrl?: string | null;
      heroDesktopUrl?: string | null;
    },
  ) {
    const update: Prisma.StudioUpdateInput = {};

    if (data.name !== undefined) update.name = data.name;
    if (data.address !== undefined) update.address = data.address;
    if (data.contact !== undefined) update.contact = data.contact;
    if (data.logoUrl !== undefined) update.logoUrl = data.logoUrl;
    if (data.heroMobileUrl !== undefined) {
      update.heroMobileUrl = data.heroMobileUrl;
    }
    if (data.heroDesktopUrl !== undefined) {
      update.heroDesktopUrl = data.heroDesktopUrl;
    }

    return this.prisma.studio.update({
      where: { id },
      data: update,
    });
  }

  async updateSettings(
    studioId: string,
    data: {
      graceDays?: number;
      expireAlertDays?: number;
      platformFeePercent?: number;
      gstPercent?: number;
      admissionFee?: number;
      timezone?: string;
      razorpayKeyId?: string | null;
      razorpayKeySecret?: string | null;
      gstNumber?: string | null;
      danceStyles?: unknown;
    },
  ) {
    const update: {
      graceDays?: number;
      expireAlertDays?: number;
      platformFeePercent?: number;
      gstPercent?: number;
      admissionFee?: number;
      timezone?: string;
      razorpayKeyId?: string | null;
      razorpayKeySecret?: string | null;
      razorpaySecretIv?: string | null;
      gstNumber?: string | null;
      danceStyles?: Prisma.InputJsonValue | typeof Prisma.DbNull;
    } = {};

    if (data.graceDays !== undefined) update.graceDays = data.graceDays;
    if (data.expireAlertDays !== undefined) {
      update.expireAlertDays = data.expireAlertDays;
    }
    if (data.platformFeePercent !== undefined) {
      update.platformFeePercent = data.platformFeePercent;
    }
    if (data.gstPercent !== undefined) {
      update.gstPercent = data.gstPercent;
    }
    if (data.admissionFee !== undefined) {
      if (data.admissionFee < 0) {
        throw new BadRequestException("Admission fee cannot be negative");
      }
      update.admissionFee = data.admissionFee;
    }
    if (data.timezone !== undefined) {
      const timezone = data.timezone.trim();
      if (!isValidIanaTimeZone(timezone)) {
        throw new BadRequestException("Invalid timezone");
      }
      update.timezone = timezone;
    }

    if (data.razorpayKeyId !== undefined) {
      update.razorpayKeyId = data.razorpayKeyId?.trim() || null;
    }

    if (data.gstNumber !== undefined) {
      const trimmed = data.gstNumber?.trim().toUpperCase() ?? "";
      update.gstNumber = trimmed || null;
    }

    if (data.danceStyles !== undefined) {
      const parsed = parseDanceStyles(data.danceStyles);
      update.danceStyles =
        parsed === null ? Prisma.DbNull : (parsed as Prisma.InputJsonValue);
    }

    const existing = await this.prisma.studioSettings.findUnique({
      where: { studioId },
      select: {
        razorpayKeyId: true,
        razorpayKeySecret: true,
        razorpaySecretIv: true,
      },
    });

    let plainSecret: string | null | undefined;
    if (data.razorpayKeySecret !== undefined) {
      const secret = data.razorpayKeySecret?.trim() ?? "";
      if (!secret) {
        update.razorpayKeySecret = null;
        update.razorpaySecretIv = null;
        plainSecret = null;
      } else {
        plainSecret = secret;
      }
    }

    const nextKeyId =
      update.razorpayKeyId !== undefined
        ? update.razorpayKeyId
        : (existing?.razorpayKeyId ?? null);

    if (plainSecret) {
      if (!nextKeyId) {
        throw new BadRequestException(
          "Razorpay key ID is required when saving a key secret",
        );
      }
      await this.razorpay.assertValidCredentials({
        keyId: nextKeyId,
        keySecret: plainSecret,
      });
      const sealed = this.crypto.encryptStudioSecret(plainSecret);
      update.razorpayKeySecret = sealed.ciphertext;
      update.razorpaySecretIv = sealed.iv;
    } else if (
      data.razorpayKeyId !== undefined &&
      nextKeyId &&
      existing?.razorpayKeySecret &&
      existing.razorpaySecretIv &&
      plainSecret === undefined
    ) {
      const existingSecret = this.crypto.decryptStudioSecret(
        existing.razorpayKeySecret,
        existing.razorpaySecretIv,
      );
      await this.razorpay.assertValidCredentials({
        keyId: nextKeyId,
        keySecret: existingSecret,
      });
    }

    const settings = await this.prisma.studioSettings.upsert({
      where: { studioId },
      update,
      create: { studioId, ...update },
    });

    return {
      graceDays: settings.graceDays,
      expireAlertDays: settings.expireAlertDays,
      platformFeePercent: settings.platformFeePercent,
      gstPercent: settings.gstPercent,
      admissionFee: Number(settings.admissionFee),
      timezone: settings.timezone,
      razorpayKeyId: settings.razorpayKeyId,
      razorpayConfigured: Boolean(
        settings.razorpayKeyId &&
          settings.razorpayKeySecret &&
          settings.razorpaySecretIv,
      ),
      danceStyles: settings.danceStyles ?? null,
      gstNumber: settings.gstNumber ?? null,
    };
  }

  async deleteStudio(id: string) {
    const studio = await this.prisma.studio.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!studio) {
      throw new NotFoundException("Studio not found");
    }

    // Collect before cascading studio data away — null-studio students only
    // show up through bookings/enrollments/etc. while those rows still exist.
    const [members, linkedOrphans] = await Promise.all([
      this.prisma.user.findMany({
        where: { studioId: id },
        select: { id: true },
      }),
      this.prisma.user.findMany({
        where: {
          studioId: null,
          role: UserRole.STUDENT,
          OR: [
            { bookings: { some: { studioId: id } } },
            { batchEnrollments: { some: { batch: { studioId: id } } } },
            { invoices: { some: { studioId: id } } },
            { studentGoals: { some: { studioId: id } } },
            {
              membershipSeats: {
                some: { membership: { subscription: { studioId: id } } },
              },
            },
            {
              purchasedMemberships: {
                some: { subscription: { studioId: id } },
              },
            },
            { preferredBranch: { studioId: id } },
            {
              attendanceRecords: {
                some: { session: { batch: { studioId: id } } },
              },
            },
            {
              contestEntryMemberships: {
                some: {
                  entry: { category: { contest: { studioId: id } } },
                },
              },
            },
            {
              contestEntriesRegistered: {
                some: { category: { contest: { studioId: id } } },
              },
            },
          ],
        },
        select: { id: true },
      }),
    ]);

    const userIds = [
      ...new Set([
        ...members.map((member) => member.id),
        ...linkedOrphans.map((user) => user.id),
      ]),
    ];

    await this.prisma.$transaction(async (tx) => {
      // Contest certificates Restrict template deletes; clear them first.
      await tx.contestCertificate.deleteMany({
        where: { template: { studioId: id } },
      });
      await tx.contest.deleteMany({ where: { studioId: id } });
      // Batches Restrict branch deletes; remove batches before studio cascade.
      await tx.batch.deleteMany({ where: { studioId: id } });

      if (userIds.length > 0) {
        // registeredById has no onDelete; clear before wiping users.
        await tx.contestEntry.deleteMany({
          where: { registeredById: { in: userIds } },
        });
      }

      await tx.user.updateMany({
        where: { studioId: id },
        data: { studioId: null, preferredBranchId: null },
      });

      await tx.studio.delete({ where: { id } });

      if (userIds.length > 0) {
        await tx.user.deleteMany({ where: { id: { in: userIds } } });
      }
    });

    return { deleted: true as const, id: studio.id, name: studio.name };
  }

  assertTenantCanManage(
    user: { role: UserRole; studioId: string | null },
    studioId: string,
  ) {
    if (user.role === UserRole.SYSTEM_ADMIN) {
      return;
    }
    if (user.studioId !== studioId) {
      throw new ForbiddenException("You can only manage your own studio");
    }
  }
}
