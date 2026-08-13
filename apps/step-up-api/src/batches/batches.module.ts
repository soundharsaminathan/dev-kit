import { forwardRef, Module } from "@nestjs/common";
import { BillingModule } from "../billing/billing.module";
import { CalendarModule } from "../calendar/calendar.module";
import { ChatModule } from "../chat/chat.module";
import { MediaModule } from "../media/media.module";
import { MembershipsModule } from "../memberships/memberships.module";
import { SessionsModule } from "../sessions/sessions.module";
import { UsersModule } from "../users/users.module";
import { BatchCommandsService } from "./application/batch.commands";
import { BatchQueriesService } from "./application/batch.queries";
import { BatchesController } from "./batches.controller";
import { BatchesService } from "./batches.service";
import { BatchQuery } from "./persistence/batch.query";
import { BatchRepository } from "./persistence/batch.repository";

@Module({
  imports: [
    CalendarModule,
    SessionsModule,
    ChatModule,
    MembershipsModule,
    UsersModule,
    MediaModule,
    forwardRef(() => BillingModule),
  ],
  controllers: [BatchesController],
  providers: [
    BatchesService,
    BatchQuery,
    BatchRepository,
    BatchQueriesService,
    BatchCommandsService,
  ],
  exports: [BatchesService, BatchQueriesService, BatchCommandsService],
})
export class BatchesModule {}
