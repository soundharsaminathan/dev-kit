import { Module } from "@nestjs/common";
import { NotificationsController } from "./notifications.controller";
import { NotificationService } from "./notifications.service";
import { OutboxProcessorService } from "./outbox-processor.service";

@Module({
  controllers: [NotificationsController],
  providers: [NotificationService, OutboxProcessorService],
  exports: [NotificationService, OutboxProcessorService],
})
export class NotificationsModule {}
