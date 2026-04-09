import "reflect-metadata";

import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";
import { configureApp } from "./common/configure-app";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: false
  });
  configureApp(app);
  const port = Number(process.env.PORT ?? 4000);
  const host = process.env.LISTEN_HOST ?? "0.0.0.0";
  await app.listen(port, host);
}

bootstrap();
