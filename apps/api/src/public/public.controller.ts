import { Controller, Get, Inject } from "@nestjs/common";

import { SiteSettingsService } from "../site-settings/site-settings.service";

@Controller()
export class PublicController {
  constructor(@Inject(SiteSettingsService) private readonly siteSettings: SiteSettingsService) {
    this.getPublicConfig = this.getPublicConfig.bind(this);
  }

  @Get("public-config")
  async getPublicConfig() {
    const config = await this.siteSettings.getPublicConfig();
    const adsEnabled = Object.values(config.banners.slots).some((slot) => slot.enabled);
    return {
      ok: true as const,
      ...config,
      // Legacy flat fields (backward-compatible)
      enableSolanaLogin: config.features.enableSolanaLogin,
      adsEnabled,
      appName: config.branding.appName,
      contactEmail: config.support.email,
      contactWeChat: config.support.wechat,
      contactTelegram: config.support.telegram,
      discoverTags: config.discover.tags,
      discoverLounges: config.discover.lounges,
      banners: Object.fromEntries(
        Object.entries(config.banners.slots).map(([key, value]) => [
          key,
          {
            titleZh: value.titleZh,
            titleEn: value.titleEn,
            descriptionZh: value.descriptionZh,
            descriptionEn: value.descriptionEn
          }
        ])
      )
    };
  }
}
