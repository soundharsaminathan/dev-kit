import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const corsOrigin = process.env.CORS_ORIGIN?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigin?.length ? corsOrigin : true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = Number(process.env.PORT ?? 3010);
  await app.listen(port, "0.0.0.0");
  console.log(`loan-mate API listening on 0.0.0.0:${port}`);
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
