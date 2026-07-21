import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { NotificationType, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { PushService } from "./push.service";

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PushService) private readonly push: PushService,
  ) {}

  listForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  markRead(userId: string, id: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
  }

  async create(data: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    meta?: Prisma.InputJsonValue;
  }) {
    const notification = await this.prisma.notification.create({ data });

    void this.push
      .sendToUser(data.userId, {
        title: data.title,
        body: data.body,
        data: {
          notificationId: notification.id,
          type: data.type,
          ...(data.meta &&
          typeof data.meta === "object" &&
          !Array.isArray(data.meta)
            ? Object.fromEntries(
                Object.entries(data.meta as Record<string, unknown>).map(
                  ([key, value]) => [key, String(value)],
                ),
              )
            : {}),
        },
      })
      .catch(() => undefined);

    return notification;
  }

  async markReadOne(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException("Notification not found");
    }

    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }
}
