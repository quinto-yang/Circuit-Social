import type { INestApplication } from "@nestjs/common";
import cookieParser from "cookie-parser";
import helmet from "helmet";

import { HttpErrorFilter } from "./http-error.filter";
import { resolveAllowedWebOrigins } from "./web-origins";

export function configureApp(app: INestApplication) {
  app.enableCors({
    origin: resolveAllowedWebOrigins(),
    credentials: true
  });
  app.use(cookieParser());
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false
    })
  );
  app.useGlobalFilters(new HttpErrorFilter());
  app.setGlobalPrefix("api");
  return app;
}
