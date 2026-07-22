import { Module } from "@nestjs/common";
import { EventsModule } from "../events/events.module";
import { ChatNotificationBridgeService } from "./chat-notification-bridge.service";
import { NotificationCommandsService } from "./notification-commands.service";
import { NotificationsController } from "./notifications.controller";
import { NotificationsGateway } from "./notifications.gateway";
import { NotificationsService } from "./notifications.service";
import { PreferencesService } from "./preferences.service";
import { PushService } from "./push.service";
import { UnreadCacheService } from "./unread-cache.service";

@Module({
  imports: [EventsModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationCommandsService,
    NotificationsGateway,
    PreferencesService,
    PushService,
    UnreadCacheService,
    ChatNotificationBridgeService,
  ],
  exports: [
    NotificationsService,
    NotificationCommandsService,
    PushService,
    PreferencesService,
    UnreadCacheService,
    NotificationsGateway,
    ChatNotificationBridgeService,
  ],
})
export class NotificationsModule {}
