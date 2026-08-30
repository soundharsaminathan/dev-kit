import "./instrument";
import { NestFactory } from "@nestjs/core";
import { captureException } from "./sentry";
import { WorkerModule } from "./worker.module";

async function bootstrap() {
  if (!process.env.REDIS_URL) {
    throw new Error("REDIS_URL is required to start the classa worker");
  }

  const app = await NestFactory.create(WorkerModule);
  const port = Number(process.env.WORKER_PORT ?? process.env.PORT ?? 3001);
  await app.listen(port, "0.0.0.0");
  console.log(`classa worker listening on 0.0.0.0:${port} (health only)`);
}

bootstrap().catch((error) => {
  captureException(error);
  console.error(error);
  process.exit(1);
});
