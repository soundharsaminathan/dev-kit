import "reflect-metadata";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { NotificationsModule } from "../src/notifications/notifications.module";
import { OutboxProcessorService } from "../src/notifications/outbox-processor.service";
import { PrismaModule } from "../src/prisma/prisma.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    NotificationsModule,
  ],
})
class OutboxOnceModule {}

async function main() {
  const app = await NestFactory.createApplicationContext(OutboxOnceModule, {
    logger: ["error", "warn"],
  });
  try {
    const outbox = app.get(OutboxProcessorService);
    const result = await outbox.processPending(200);
    console.log(JSON.stringify(result));
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
