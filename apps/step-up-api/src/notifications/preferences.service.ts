import { Inject, Injectable } from "@nestjs/common";
import { NotificationChannel } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { NOTIFICATION_TYPE_REGISTRY } from "./templates/notification-templates";

export type PreferenceInput = {
  type: string;
  channel: NotificationChannel;
  enabled: boolean;
  quietStartMinutes?: number | null;
  quietEndMinutes?: number | null;
};

@Injectable()
export class PreferencesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listForUser(userId: string) {
    const rows = await this.prisma.notificationPreference.findMany({
      where: { userId },
    });

    const defaults = Object.entries(NOTIFICATION_TYPE_REGISTRY).flatMap(
      ([type, meta]) =>
        meta.defaultChannels.map((channel) => ({
          type,
          channel: channel as NotificationChannel,
          enabled: true,
          quietStartMinutes: null as number | null,
          quietEndMinutes: null as number | null,
        })),
    );

    return defaults.map((fallback) => {
      const match = rows.find(
        (row) => row.type === fallback.type && row.channel === fallback.channel,
      );
      return match
        ? {
            type: match.type,
            channel: match.channel,
            enabled: match.enabled,
            quietStartMinutes: match.quietStartMinutes,
            quietEndMinutes: match.quietEndMinutes,
          }
        : fallback;
    });
  }

  async upsertMany(userId: string, preferences: PreferenceInput[]) {
    await this.prisma.$transaction(
      preferences.map((pref) =>
        this.prisma.notificationPreference.upsert({
          where: {
            userId_type_channel: {
              userId,
              type: pref.type,
              channel: pref.channel,
            },
          },
          create: {
            userId,
            type: pref.type,
            channel: pref.channel,
            enabled: pref.enabled,
            quietStartMinutes: pref.quietStartMinutes ?? null,
            quietEndMinutes: pref.quietEndMinutes ?? null,
          },
          update: {
            enabled: pref.enabled,
            quietStartMinutes: pref.quietStartMinutes ?? null,
            quietEndMinutes: pref.quietEndMinutes ?? null,
          },
        }),
      ),
    );
    return this.listForUser(userId);
  }

  async isChannelEnabled(
    userId: string,
    type: string,
    channel: NotificationChannel,
  ) {
    const specific = await this.prisma.notificationPreference.findUnique({
      where: {
        userId_type_channel: { userId, type, channel },
      },
    });
    if (specific) {
      return specific.enabled;
    }

    const wildcard = await this.prisma.notificationPreference.findUnique({
      where: {
        userId_type_channel: { userId, type: "*", channel },
      },
    });
    if (wildcard) {
      return wildcard.enabled;
    }

    const registry = NOTIFICATION_TYPE_REGISTRY[type];
    if (!registry) {
      return channel !== NotificationChannel.EMAIL;
    }
    return registry.defaultChannels.includes(
      channel as "IN_APP" | "PUSH" | "EMAIL",
    );
  }

  async isInQuietHours(userId: string, type: string) {
    const prefs = await this.prisma.notificationPreference.findMany({
      where: {
        userId,
        type: { in: [type, "*"] },
        channel: NotificationChannel.PUSH,
        OR: [
          { quietStartMinutes: { not: null } },
          { quietEndMinutes: { not: null } },
        ],
      },
    });

    const pref =
      prefs.find((row) => row.type === type) ??
      prefs.find((row) => row.type === "*");

    if (
      !pref ||
      pref.quietStartMinutes == null ||
      pref.quietEndMinutes == null
    ) {
      return false;
    }

    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    const start = pref.quietStartMinutes;
    const end = pref.quietEndMinutes;

    if (start === end) {
      return false;
    }
    if (start < end) {
      return minutes >= start && minutes < end;
    }
    return minutes >= start || minutes < end;
  }
}
