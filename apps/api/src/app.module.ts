import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ServeStaticModule } from "@nestjs/serve-static";
import { ThrottlerModule } from "@nestjs/throttler";
import path from "node:path";

import { AuthModule } from "./auth/auth.module";
import { DidModule } from "./did/did.module";
import { IdentityModule } from "./identity/identity.module";
import { RealtimeModule } from "./realtime/realtime.module";
import { SocialModule } from "./social/social.module";
import { StoreModule } from "./store/store.module";
import { TenantModule } from "./tenant/tenant.module";
import { TestSupportModule } from "./test-support/test-support.module";

const uploadsRoot = path.resolve(__dirname, "..", "uploads");

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
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
    StoreModule,
    IdentityModule,
    DidModule,
    AuthModule,
    SocialModule,
    TenantModule,
    RealtimeModule,
    ...(process.env.NODE_ENV === "test" ? [TestSupportModule] : [])
  ]
})
export class AppModule {}
