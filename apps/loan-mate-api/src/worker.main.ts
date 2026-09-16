import "reflect-metadata";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { JobsModule } from "./jobs/jobs.module";
import { OverdueJobsService } from "./jobs/overdue-jobs.service";
import { NotificationsModule } from "./notifications/notifications.module";
import { OutboxProcessorService } from "./notifications/outbox-processor.service";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    JobsModule,
    NotificationsModule,
  ],
})
class WorkerModule {}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  const jobs = app.get(OverdueJobsService);
  const outbox = app.get(OutboxProcessorService);

  const loop = process.argv.includes("--loop");
  const once = !loop || process.argv.includes("--once");

  const runJobs = async () => {
    const overdue = await jobs.runDailyOverdueAndPenalty();
    const outboxResult = await outbox.processPending();
    return { overdue, outbox: outboxResult };
  };

  if (once && !loop) {
    const result = await runJobs();
    console.log("Worker completed:", result);
    await app.close();
    return;
  }

  console.log("Worker looping every 24h (Ctrl+C to stop)");
  const run = async () => {
    try {
      const result = await runJobs();
      console.log(new Date().toISOString(), result);
    } catch (err) {
      console.error("Job failed", err);
    }
  };
  await run();
  setInterval(run, 24 * 60 * 60 * 1000);
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
