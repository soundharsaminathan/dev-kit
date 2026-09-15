import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { JobsModule } from "./jobs/jobs.module";
import { OverdueJobsService } from "./jobs/overdue-jobs.service";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    JobsModule,
  ],
})
class WorkerModule {}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  const jobs = app.get(OverdueJobsService);

  const loop = process.argv.includes("--loop");
  const once = !loop || process.argv.includes("--once");

  if (once && !loop) {
    const result = await jobs.runDailyOverdueAndPenalty();
    console.log("Overdue job completed:", result);
    await app.close();
    return;
  }

  console.log("Worker looping every 24h (Ctrl+C to stop)");
  const run = async () => {
    try {
      const result = await jobs.runDailyOverdueAndPenalty();
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
