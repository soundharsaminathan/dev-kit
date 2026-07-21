import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as admin from "firebase-admin";
import { PrismaService } from "../prisma/prisma.service";

type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

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

  async registerToken(userId: string, token: string) {
    await this.prisma.pushDevice.upsert({
      where: { token },
      create: { userId, token },
      update: { userId },
    });
  }

  async sendToUser(userId: string, payload: PushPayload) {
    this.ensureFirebase();

    if (!admin.apps.length) {
      return;
    }

    const devices = await this.prisma.pushDevice.findMany({
      where: { userId },
      select: { token: true },
    });

    if (devices.length === 0) {
      return;
    }

    const tokens = devices.map((device) => device.token);
    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data,
      webpush: {
        fcmOptions: {
          link: "/",
        },
        notification: {
          icon: "/icons/icon-192.png",
        },
      },
    });

    await Promise.all(
      response.responses.map(async (result, index) => {
        if (result.success) {
          return;
        }

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
  }
}
