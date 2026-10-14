import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { SocialController } from "./social.controller";
import { SocialService } from "./social.service";

@Module({
  imports: [NotificationsModule],
  controllers: [SocialController],
  providers: [SocialService],
  exports: [SocialService],
})
export class SocialModule {}
