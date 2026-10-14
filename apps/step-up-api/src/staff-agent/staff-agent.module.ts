import { Module } from "@nestjs/common";
import { BatchesModule } from "../batches/batches.module";
import { BookingsModule } from "../bookings/bookings.module";
import { SessionsModule } from "../sessions/sessions.module";
import { UsersModule } from "../users/users.module";
import { GeminiClient } from "./gemini.client";
import { GroqClient } from "./groq.client";
import { OpenAiClient } from "./openai.client";
import { StaffAgentController } from "./staff-agent.controller";
import { StaffAgentService } from "./staff-agent.service";
import { StaffAgentConfigService } from "./staff-agent-config.service";
import { StaffAgentToolExecutor } from "./tool-executor";

@Module({
  imports: [UsersModule, BookingsModule, BatchesModule, SessionsModule],
  controllers: [StaffAgentController],
  providers: [
    StaffAgentConfigService,
    GroqClient,
    GeminiClient,
    OpenAiClient,
    StaffAgentToolExecutor,
    StaffAgentService,
  ],
})
export class StaffAgentModule {}
