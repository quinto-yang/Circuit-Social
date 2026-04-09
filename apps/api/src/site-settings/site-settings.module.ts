import { Module } from "@nestjs/common";

import {
  MemorySiteSettingsRepository,
  PrismaSiteSettingsRepository,
  SITE_SETTINGS_REPOSITORY
} from "./site-settings.repository";
import { SiteSettingsService } from "./site-settings.service";

@Module({
  providers: [
    SiteSettingsService,
    PrismaSiteSettingsRepository,
    MemorySiteSettingsRepository,
    {
      provide: SITE_SETTINGS_REPOSITORY,
      useFactory: (
        prismaRepo: PrismaSiteSettingsRepository,
        memoryRepo: MemorySiteSettingsRepository
      ) => (process.env.DATABASE_URL ? prismaRepo : memoryRepo),
      inject: [PrismaSiteSettingsRepository, MemorySiteSettingsRepository]
    }
  ],
  exports: [SiteSettingsService]
})
export class SiteSettingsModule {}

