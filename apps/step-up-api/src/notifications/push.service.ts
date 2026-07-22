import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as admin from "firebase-admin";
import { PrismaService } from "../prisma/prisma.service";
import { sanitizeDeepLink } from "./deep-link";

type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
  deepLink?: string | null;
};

const MAX_DEVICES_PER_USER = 10;

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private initialized = false;

  constructor(
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  private ensureFirebase() {
    if (this.initialized || admin.apps.length > 0) {
      this.initialized = true;
      return;
    }

    const projectId = this.config.get<string>("FIREBASE_PROJECT_ID");
    const clientEmail = this.config.get<string>("FIREBASE_CLIENT_EMAIL");
    const privateKey = this.config
      .get<string>("FIREBASE_PRIVATE_KEY")
      ?.replace(/\\n/g, "\n");

    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      this.initialized = true;
    }
  }

  async registerToken(
    userId: string,
    token: string,
    options: {
      platform?: string;
      appVersion?: string;
      userAgent?: string;
    } = {},
  ) {
    const platform = options.platform ?? "web";
    await this.prisma.pushDevice.upsert({
      where: { token },
      create: {
        userId,
        token,
        platform,
        appVersion: options.appVersion,
        userAgent: options.userAgent,
        lastSeenAt: new Date(),
      },
      update: {
        userId,
        platform,
        appVersion: options.appVersion,
        userAgent: options.userAgent,
        lastSeenAt: new Date(),
      },
    });

    const devices = await this.prisma.pushDevice.findMany({
      where: { userId },
      orderBy: { lastSeenAt: "desc" },
    });

    if (devices.length > MAX_DEVICES_PER_USER) {
      const toRemove = devices.slice(MAX_DEVICES_PER_USER);
      await this.prisma.pushDevice.deleteMany({
        where: { id: { in: toRemove.map((device) => device.id) } },
      });
    }

    return { ok: true };
  }

  async unregisterToken(userId: string, token: string) {
    await this.prisma.pushDevice.deleteMany({
      where: { userId, token },
    });
    return { ok: true };
  }

  async sendToUser(userId: string, payload: PushPayload) {
    this.ensureFirebase();

    if (!admin.apps.length) {
      return { successCount: 0, failureCount: 0, skipped: true as const };
    }

    const devices = await this.prisma.pushDevice.findMany({
      where: { userId },
      select: { token: true, platform: true },
      orderBy: { lastSeenAt: "desc" },
      take: MAX_DEVICES_PER_USER,
    });

    if (devices.length === 0) {
      return { successCount: 0, failureCount: 0, skipped: true as const };
    }

    const tokens = devices.map((device) => device.token);
    const deepLink = sanitizeDeepLink(payload.deepLink) ?? "/";
    const data: Record<string, string> = {
      ...(payload.data ?? {}),
      deepLink,
      link: deepLink,
    };

    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data,
      webpush: {
        fcmOptions: {
          link: deepLink,
        },
        notification: {
          icon: "/icons/icon-192.png",
        },
      },
      android: {
        priority: "high",
        notification: {
          clickAction: "FLUTTER_NOTIFICATION_CLICK",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
          },
        },
      },
    });

    let successCount = 0;
    let failureCount = 0;

    await Promise.all(
      response.responses.map(async (result, index) => {
        if (result.success) {
          successCount += 1;
          return;
        }

        failureCount += 1;
        const code = result.error?.code;
        if (
          code === "messaging/invalid-registration-token" ||
          code === "messaging/registration-token-not-registered"
        ) {
          await this.prisma.pushDevice
            .delete({ where: { token: tokens[index] } })
            .catch(() => undefined);
          return;
        }

        this.logger.warn(
          `Push failed for token ${tokens[index]}: ${result.error?.message ?? "unknown error"}`,
        );
      }),
    );

    return {
      successCount,
      failureCount,
      skipped: false as const,
      messageIds: response.responses
        .map((result) => result.messageId)
        .filter(Boolean),
    };
  }
}
