import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UserCryptoService } from "../users/user-crypto.service";

@Injectable()
export class StudiosService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(UserCryptoService) private readonly crypto: UserCryptoService,
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
      },
    });

    if (!studio) {
      throw new NotFoundException("Studio not found");
    }

    return studio;
  }

  async getStudio(id: string) {
    const studio = await this.prisma.studio.findUnique({
      where: { id },
      include: { settings: true, owner: true },
    });

    if (!studio) {
      throw new NotFoundException("Studio not found");
    }

    return {
      ...studio,
      owner: this.crypto.decryptUser(studio.owner),
    };
  }

  updateStudio(
    id: string,
    data: { name?: string; address?: string; contact?: string },
  ) {
    return this.prisma.studio.update({
      where: { id },
      data,
    });
  }

  updateSettings(
    studioId: string,
    data: {
      graceDays?: number;
      expireAlertDays?: number;
      platformFeePercent?: number;
    },
  ) {
    return this.prisma.studioSettings.upsert({
      where: { studioId },
      update: data,
      create: { studioId, ...data },
    });
  }

  deleteStudio(id: string) {
    return this.prisma.studio.delete({ where: { id } });
  }
}
