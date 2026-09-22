import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { UserRole } from "../generated/prisma/client";
import { zonedLocalToUtc } from "../common/zoned-local-time";
import {
  expandTrainerAvailabilityWindows,
  toAvailabilityEvent,
} from "../calendar/calendar-query";
import {
  freelanceTrainerAttachError,
  marketplaceMissingMediaAlert,
  type MarketplaceMediaAlert,
} from "../discover/marketplace.contract";
import { MediaService } from "../media/media.service";
import { PrismaService } from "../prisma/prisma.service";
import { UserCryptoService } from "../users/user-crypto.service";

export type MarketplaceAlertItem = MarketplaceMediaAlert & {
  href: string;
};

@Injectable()
export class MarketplaceControlsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(UserCryptoService) private readonly crypto: UserCryptoService,
    @Inject(MediaService) private readonly media: MediaService,
  ) {}

  async listAlerts(studioId: string): Promise<{ items: MarketplaceAlertItem[] }> {
    const studio = await this.prisma.studio.findUnique({
      where: { id: studioId },
      select: {
        id: true,
        name: true,
        heroDesktopUrl: true,
        heroMobileUrl: true,
        branches: {
          select: { coverMedia: { select: { objectKey: true } } },
        },
        batches: {
          where: { active: true },
          select: { id: true, name: true, coverImageUrl: true },
        },
        trainerLinks: {
          select: {
            trainer: {
              select: {
                id: true,
                photoUrl: true,
                role: true,
                active: true,
                encryptedKey: true,
                piiCiphertext: true,
                piiIv: true,
              },
            },
          },
        },
        members: {
          where: { role: UserRole.TRAINER, active: true },
          select: {
            id: true,
            photoUrl: true,
            role: true,
            active: true,
            encryptedKey: true,
            piiCiphertext: true,
            piiIv: true,
          },
        },
      },
    });
    if (!studio) throw new NotFoundException("Studio not found");

    const items: MarketplaceAlertItem[] = [];
    const studioAlert = marketplaceMissingMediaAlert({
      kind: "STUDIO",
      objectId: studio.id,
      objectName: studio.name,
      heroDesktopUrl: studio.heroDesktopUrl,
      heroMobileUrl: studio.heroMobileUrl,
      branchCoverUrl: studio.branches.find((branch) => branch.coverMedia?.objectKey)
        ?.coverMedia?.objectKey,
    });
    if (studioAlert) {
      items.push({ ...studioAlert, href: "/app/settings/branding" });
    }

    for (const batch of studio.batches) {
      const alert = marketplaceMissingMediaAlert({
        kind: "CLASS",
        objectId: batch.id,
        objectName: batch.name,
        coverImageUrl: batch.coverImageUrl,
      });
      if (alert) {
        items.push({
          ...alert,
          href: `/app/batches/${batch.id}/settings`,
        });
      }
    }

    const trainers = new Map<
      string,
      {
        id: string;
        photoUrl: string | null;
        encryptedKey: string;
        piiCiphertext: string;
        piiIv: string;
      }
    >();
    for (const member of studio.members) {
      trainers.set(member.id, member);
    }
    for (const link of studio.trainerLinks) {
      trainers.set(link.trainer.id, link.trainer);
    }
    for (const trainer of trainers.values()) {
      const alert = marketplaceMissingMediaAlert({
        kind: "TRAINER",
        objectId: trainer.id,
        objectName: this.trainerName(trainer),
        photoUrl: trainer.photoUrl,
      });
      if (alert) {
        items.push({ ...alert, href: "/app/trainers" });
      }
    }

    return { items };
  }

  async listHireableTrainers(studioId: string, from: Date, to: Date) {
    const studio = await this.prisma.studio.findUnique({
      where: { id: studioId },
      select: {
        id: true,
        settings: { select: { timezone: true } },
      },
    });
    if (!studio) throw new NotFoundException("Studio not found");
    const timezone = studio.settings?.timezone ?? "Asia/Kolkata";

    const trainers = await this.prisma.user.findMany({
      where: {
        role: UserRole.TRAINER,
        active: true,
        trainerAvailabilities: { some: {} },
        trainedStudios: { none: { studioId } },
        OR: [{ studioId: null }, { studioId: { not: studioId } }],
      },
      select: {
        id: true,
        photoUrl: true,
        publicSlug: true,
        studioId: true,
        encryptedKey: true,
        piiCiphertext: true,
        piiIv: true,
        trainerAvailabilities: {
          select: { weekday: true, startsAt: true, endsAt: true },
          orderBy: [{ weekday: "asc" }, { startsAt: "asc" }],
        },
      },
    });

    return Promise.all(
      trainers.map(async (trainer) => {
        const windows = expandTrainerAvailabilityWindows(
          trainer.trainerAvailabilities,
          from,
          to,
          timezone,
          zonedLocalToUtc,
        );
        return {
          id: trainer.id,
          name: this.trainerName(trainer),
          slug: trainer.publicSlug,
          photoUrl: await this.media.signReadUrl(trainer.photoUrl),
          attached: false,
          availability: trainer.trainerAvailabilities,
          nextWindows: windows.map((window) => ({
            startsAt: window.startsAt.toISOString(),
            endsAt: window.endsAt.toISOString(),
          })),
        };
      }),
    );
  }

  async attachTrainer(studioId: string, trainerId: string) {
    const studio = await this.prisma.studio.findUnique({
      where: { id: studioId },
      select: { id: true },
    });
    if (!studio) throw new NotFoundException("Studio not found");

    const trainer = await this.prisma.user.findUnique({
      where: { id: trainerId },
      select: {
        id: true,
        role: true,
        active: true,
        studioId: true,
        _count: {
          select: {
            trainedStudios: { where: { studioId } },
            trainerAvailabilities: true,
          },
        },
      },
    });
    if (!trainer) throw new NotFoundException("Trainer not found");

    const error = freelanceTrainerAttachError({
      role: trainer.role,
      active: trainer.active,
      alreadyLinked: trainer._count.trainedStudios > 0,
      homeStudio: trainer.studioId === studioId,
      hasAvailability: trainer._count.trainerAvailabilities > 0,
    });
    if (error) throw new BadRequestException(error);

    const link = await this.prisma.trainerStudio.create({
      data: {
        trainerId,
        studioId,
        isHome: false,
      },
    });
    return {
      trainerId: link.trainerId,
      studioId: link.studioId,
      isHome: link.isHome,
    };
  }

  async detachTrainer(studioId: string, trainerId: string) {
    const existing = await this.prisma.trainerStudio.findUnique({
      where: { trainerId_studioId: { trainerId, studioId } },
    });
    if (!existing) throw new NotFoundException("Trainer is not attached");
    if (existing.isHome) {
      throw new BadRequestException("Cannot detach a home-studio trainer");
    }
    await this.prisma.trainerStudio.delete({
      where: { trainerId_studioId: { trainerId, studioId } },
    });
    return { detached: true, trainerId, studioId };
  }

  async listAvailabilityEvents(input: {
    studioId: string;
    from: Date;
    to: Date;
    trainerId?: string;
  }) {
    const studio = await this.prisma.studio.findUnique({
      where: { id: input.studioId },
      select: { settings: { select: { timezone: true } } },
    });
    const timezone = studio?.settings?.timezone ?? "Asia/Kolkata";

    const [hireable, attached] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          role: UserRole.TRAINER,
          active: true,
          trainerAvailabilities: { some: {} },
          trainedStudios: { none: { studioId: input.studioId } },
          OR: [{ studioId: null }, { studioId: { not: input.studioId } }],
          ...(input.trainerId ? { id: input.trainerId } : {}),
        },
        select: {
          id: true,
          encryptedKey: true,
          piiCiphertext: true,
          piiIv: true,
          trainerAvailabilities: {
            select: { weekday: true, startsAt: true, endsAt: true },
          },
        },
      }),
      this.prisma.user.findMany({
        where: {
          role: UserRole.TRAINER,
          active: true,
          trainerAvailabilities: { some: {} },
          trainedStudios: { some: { studioId: input.studioId } },
          ...(input.trainerId ? { id: input.trainerId } : {}),
        },
        select: {
          id: true,
          encryptedKey: true,
          piiCiphertext: true,
          piiIv: true,
          trainerAvailabilities: {
            select: { weekday: true, startsAt: true, endsAt: true },
          },
        },
      }),
    ]);

    const events = [];
    for (const trainer of hireable) {
      const windows = expandTrainerAvailabilityWindows(
        trainer.trainerAvailabilities,
        input.from,
        input.to,
        timezone,
        zonedLocalToUtc,
      );
      const name = this.trainerName(trainer);
      for (const window of windows) {
        events.push(
          toAvailabilityEvent({
            trainerId: trainer.id,
            trainerName: name,
            startsAt: window.startsAt,
            endsAt: window.endsAt,
            attached: false,
          }),
        );
      }
    }
    for (const trainer of attached) {
      const windows = expandTrainerAvailabilityWindows(
        trainer.trainerAvailabilities,
        input.from,
        input.to,
        timezone,
        zonedLocalToUtc,
      );
      const name = this.trainerName(trainer);
      for (const window of windows) {
        events.push(
          toAvailabilityEvent({
            trainerId: trainer.id,
            trainerName: name,
            startsAt: window.startsAt,
            endsAt: window.endsAt,
            attached: true,
          }),
        );
      }
    }
    return events.sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
  }

  private trainerName(trainer: {
    encryptedKey: string;
    piiCiphertext: string;
    piiIv: string;
  }) {
    try {
      return this.crypto.decryptUser(trainer).name ?? "Trainer";
    } catch {
      return "Trainer";
    }
  }
}
