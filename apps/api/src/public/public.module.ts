import { Module } from "@nestjs/common";

import { StoreModule } from "../store/store.module";
import { SiteSettingsModule } from "../site-settings/site-settings.module";
import { PublicController } from "./public.controller";

@Module({
  imports: [StoreModule, SiteSettingsModule],
  controllers: [PublicController]
})
export class PublicModule {}
