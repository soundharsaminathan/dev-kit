import { Module } from "@nestjs/common";
import { CalendarModule } from "../calendar/calendar.module";
import { MembershipsModule } from "../memberships/memberships.module";
import { PaymentsModule } from "../payments/payments.module";
import { BookingCommandsService } from "./application/booking.commands";
import { BookingQueriesService } from "./application/booking.queries";
import { BookingsController } from "./bookings.controller";
import { BookingsService } from "./bookings.service";

@Module({
  imports: [MembershipsModule, CalendarModule, PaymentsModule],
  controllers: [BookingsController],
  providers: [BookingsService, BookingQueriesService, BookingCommandsService],
  exports: [BookingsService, BookingQueriesService, BookingCommandsService],
})
export class BookingsModule {}
