import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
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

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`Step Up API listening on port ${port}`);
}

bootstrap().catch((error) => {
  captureException(error);
  console.error(error);
  process.exit(1);
});
