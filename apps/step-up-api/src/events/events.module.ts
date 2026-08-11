import { type DynamicModule, Module } from "@nestjs/common";
import { OutboxProcessor } from "./outbox.processor";
import { OutboxService } from "./outbox.service";

export type EventsModuleOptions = {
  /** API: write-only outbox when Redis+worker available. Worker: always poll. */
  role: "api" | "worker";
};

@Module({})
export class EventsModule {
  static forRoot(options: EventsModuleOptions): DynamicModule {
    const inlineFallback =
      options.role === "api" &&
      (!process.env.REDIS_URL || process.env.OUTBOX_INLINE === "true");
    const runProcessor = options.role === "worker" || inlineFallback;

    const providers = runProcessor
      ? [OutboxService, OutboxProcessor]
      : [OutboxService];

    return {
      module: EventsModule,
      global: true,
      providers,
      exports: [OutboxService],
    };
  }
}
