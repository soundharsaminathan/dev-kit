import { Module } from "@nestjs/common";
import { BatchesModule } from "../batches/batches.module";
import { BookingsModule } from "../bookings/bookings.module";
import { SessionsModule } from "../sessions/sessions.module";
import { UsersModule } from "../users/users.module";
import { GroqClient } from "./groq.client";
import { StaffAgentController } from "./staff-agent.controller";
import { StaffAgentService } from "./staff-agent.service";
import { StaffAgentToolExecutor } from "./tool-executor";

@Module({
  imports: [UsersModule, BookingsModule, BatchesModule, SessionsModule],
  controllers: [StaffAgentController],
  providers: [GroqClient, StaffAgentToolExecutor, StaffAgentService],
})
export class StaffAgentModule {}
