import { Module } from "@nestjs/common";
import { CalendarModule } from "../calendar/calendar.module";
import { MembershipsModule } from "../memberships/memberships.module";
import { PaymentsModule } from "../payments/payments.module";
import { BookingsController } from "./bookings.controller";
import { BookingsService } from "./bookings.service";

@Module({
  imports: [MembershipsModule, CalendarModule, PaymentsModule],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
