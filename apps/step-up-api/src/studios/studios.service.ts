import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { MediaService } from "../media/media.service";
import { PrismaService } from "../prisma/prisma.service";
import { UserCryptoService } from "../users/user-crypto.service";
import { parseBrandTheme } from "./brand-theme";

@Injectable()
export class StudiosService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(UserCryptoService) private readonly crypto: UserCryptoService,
    @Inject(MediaService) private readonly media: MediaService,
  ) {}

  async getPublicProfile(id: string) {
    const studio = await this.prisma.studio.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        address: true,
        contact: true,
        photos: true,
        logoUrl: true,
        brandTheme: true,
      },
    });

    if (!studio) {
      throw new NotFoundException("Studio not found");
    }

    return {
      ...studio,
      logoUrl: await this.media.signReadUrl(studio.logoUrl),
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
          razorpayKeyId: studio.settings.razorpayKeyId,
          razorpayConfigured: Boolean(
            studio.settings.razorpayKeyId &&
              studio.settings.razorpayKeySecret &&
              studio.settings.razorpaySecretIv,
          ),
        }
      : null;

    return {
      ...studio,
      logoUrl: await this.media.signReadUrl(studio.logoUrl),
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
      brandTheme?: unknown;
    },
  ) {
    const update: Prisma.StudioUpdateInput = {};

    if (data.name !== undefined) update.name = data.name;
    if (data.address !== undefined) update.address = data.address;
    if (data.contact !== undefined) update.contact = data.contact;
    if (data.logoUrl !== undefined) update.logoUrl = data.logoUrl;
    if (data.brandTheme !== undefined) {
      const parsed = parseBrandTheme(data.brandTheme);
      update.brandTheme =
        parsed === null ? Prisma.DbNull : (parsed as Prisma.InputJsonValue);
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
      razorpayKeyId?: string | null;
      razorpayKeySecret?: string | null;
    },
  ) {
    const update: {
      graceDays?: number;
      expireAlertDays?: number;
      platformFeePercent?: number;
      razorpayKeyId?: string | null;
      razorpayKeySecret?: string | null;
      razorpaySecretIv?: string | null;
    } = {};

    if (data.graceDays !== undefined) update.graceDays = data.graceDays;
    if (data.expireAlertDays !== undefined) {
      update.expireAlertDays = data.expireAlertDays;
    }
    if (data.platformFeePercent !== undefined) {
      update.platformFeePercent = data.platformFeePercent;
    }

    if (data.razorpayKeyId !== undefined) {
      update.razorpayKeyId = data.razorpayKeyId?.trim() || null;
    }

    if (data.razorpayKeySecret !== undefined) {
      const secret = data.razorpayKeySecret?.trim() ?? "";
      if (!secret) {
        update.razorpayKeySecret = null;
        update.razorpaySecretIv = null;
      } else {
        const sealed = this.crypto.encryptStudioSecret(secret);
        update.razorpayKeySecret = sealed.ciphertext;
        update.razorpaySecretIv = sealed.iv;
      }
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
      razorpayKeyId: settings.razorpayKeyId,
      razorpayConfigured: Boolean(
        settings.razorpayKeyId &&
          settings.razorpayKeySecret &&
          settings.razorpaySecretIv,
      ),
    };
  }

  deleteStudio(id: string) {
    return this.prisma.studio.delete({ where: { id } });
  }
}
