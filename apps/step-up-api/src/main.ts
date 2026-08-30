import "./instrument";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { RedisIoAdapter } from "./realtime/redis-io.adapter";
import { captureException } from "./sentry";

/**
 * Staff-agent voice posts base64 audio in JSON (up to 3MB binary ≈ 4MB
 * base64, plus chat history). Express defaults to 100kb and returns
 * "request entity too large" before Gemini ever runs.
 */
const JSON_BODY_LIMIT = "5mb";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useBodyParser("json", { limit: JSON_BODY_LIMIT });

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const redisIoAdapter = new RedisIoAdapter(app, process.env.REDIS_URL || null);
  // Hard-cap Redis adapter setup so Cloud Run always reaches listen() in time.
  // Direct VPC + Memorystore can stall connection attempts on cold start.
  await Promise.race([
    redisIoAdapter.connectToRedis(),
    new Promise<void>((resolve) => {
      setTimeout(resolve, 5_000);
    }),
  ]);
  app.useWebSocketAdapter(redisIoAdapter);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, "0.0.0.0");
  console.log(`classa API listening on 0.0.0.0:${port}`);
}

bootstrap().catch((error) => {
  captureException(error);
  console.error(error);
  process.exit(1);
});
