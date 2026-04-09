import { Module } from "@nestjs/common";

import { StoreModule } from "../store/store.module";
import { SiteSettingsModule } from "../site-settings/site-settings.module";
import { AdminAuthGuard } from "./admin-auth.guard";
import { AdminController } from "./admin.controller";
import { AdminTokenService } from "./admin-token.service";

@Module({
  imports: [StoreModule, SiteSettingsModule],
  controllers: [AdminController],
  providers: [AdminAuthGuard, AdminTokenService]
})
export class AdminModule {}
