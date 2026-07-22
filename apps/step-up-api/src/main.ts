import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { RedisIoAdapter } from "./realtime/redis-io.adapter";
import { captureException, initSentry } from "./sentry";

async function bootstrap() {
  initSentry();

  const app = await NestFactory.create(AppModule);

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

  const redisIoAdapter = new RedisIoAdapter(app, process.env.REDIS_URL ?? null);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`Step Up API listening on port ${port}`);
}

bootstrap().catch((error) => {
  captureException(error);
  console.error(error);
  process.exit(1);
});
