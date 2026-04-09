import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ServeStaticModule } from "@nestjs/serve-static";
import { ThrottlerModule } from "@nestjs/throttler";
import path from "node:path";

import { AdminModule } from "./admin/admin.module";
import { AuthModule } from "./auth/auth.module";
import { DidModule } from "./did/did.module";
import { HealthModule } from "./health/health.module";
import { IdentityModule } from "./identity/identity.module";
import { PublicModule } from "./public/public.module";
import { RealtimeModule } from "./realtime/realtime.module";
import { SocialModule } from "./social/social.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { PrismaModule } from "./prisma/prisma.module";
import { StoreModule } from "./store/store.module";
import { TenantModule } from "./tenant/tenant.module";
import { TestSupportModule } from "./test-support/test-support.module";

const uploadsRoot = path.resolve(__dirname, "..", "uploads");

function validateEnv(env: Record<string, unknown>) {
  const errors: string[] = [];
  const nodeEnv = String(env.NODE_ENV ?? "development");
  const databaseUrl = String(env.DATABASE_URL ?? "");
  const webOrigin = String(env.WEB_ORIGIN ?? "");
  const enableSolanaLogin = String(env.ENABLE_SOLANA_LOGIN ?? "");
  const allowInMemoryInProd = ["1", "true"].includes(
    String(env.ALLOW_IN_MEMORY_STORE_IN_PRODUCTION ?? "").toLowerCase()
  );

  if (databaseUrl) {
    try {
      // eslint-disable-next-line no-new
      new URL(databaseUrl);
    } catch {
      errors.push("DATABASE_URL 必须是合法 URL");
    }
  }

  if (webOrigin) {
    const origins = webOrigin
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    for (const origin of origins) {
      try {
        // eslint-disable-next-line no-new
        new URL(origin);
      } catch {
        errors.push("WEB_ORIGIN 必须是合法 URL（支持逗号分隔多值）");
        break;
      }
    }
  }

  if (enableSolanaLogin && !["0", "1", "true", "false"].includes(enableSolanaLogin.toLowerCase())) {
    errors.push("ENABLE_SOLANA_LOGIN 仅支持 0/1/true/false");
  }

  if (nodeEnv === "production" && !databaseUrl && !allowInMemoryInProd) {
    errors.push("生产环境必须提供 DATABASE_URL");
  }

  if (errors.length > 0) {
    throw new Error(`环境变量校验失败: ${errors.join("; ")}`);
  }
  return env;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 45
      }
    ]),
    ServeStaticModule.forRoot({
      rootPath: uploadsRoot,
      serveRoot: "/static/uploads"
    }),
    PrismaModule,
    HealthModule,
    StoreModule,
    IdentityModule,
    DidModule,
    AuthModule,
    PublicModule,
    AdminModule,
    SocialModule,
    TenantModule,
    NotificationsModule,
    RealtimeModule,
    ...(process.env.NODE_ENV === "test" ? [TestSupportModule] : [])
  ]
})
export class AppModule {}
