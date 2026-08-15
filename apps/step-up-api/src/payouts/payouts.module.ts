import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { PayoutsController } from "./payouts.controller";
import { PayoutsService } from "./payouts.service";

@Module({
  imports: [NotificationsModule],
  controllers: [PayoutsController],
  providers: [PayoutsService],
})
export class PayoutsModule {}
