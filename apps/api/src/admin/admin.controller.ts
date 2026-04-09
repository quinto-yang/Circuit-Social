import { BadRequestException, Body, Controller, Get, Inject, Post, Query, UseGuards } from "@nestjs/common";

import { AdminAuthGuard } from "./admin-auth.guard";
import { AdminTokenService } from "./admin-token.service";
import { MemoryStoreService } from "../store/memory-store.service";
import { SiteSettingsService } from "../site-settings/site-settings.service";
import type { PublicConfig } from "../site-settings/site-settings.types";

type SiteSettingsBody = Partial<PublicConfig> & {
  /** 兼容旧前端字段（逐步废弃） */
  enableSolanaLogin?: boolean;
  adsEnabled?: boolean;
  appName?: string;
  contactEmail?: string;
  contactWeChat?: string;
  contactTelegram?: string;
  discoverTags?: string[];
  discoverLounges?: PublicConfig["discover"]["lounges"];
  banners?: unknown;
};

type RotateAdminTokenBody = {
  token?: string;
};

@Controller("admin")
@UseGuards(AdminAuthGuard)
export class AdminController {
  constructor(
    @Inject(MemoryStoreService) private readonly store: MemoryStoreService,
    @Inject(SiteSettingsService) private readonly siteSettings: SiteSettingsService,
    @Inject(AdminTokenService) private readonly adminToken: AdminTokenService
  ) {}

  @Get("site-settings")
  async getSiteSettings() {
    const config = await this.siteSettings.getPublicConfig();
    return { ok: true as const, ...config, meta: { updatedAt: this.siteSettings.getUpdatedAt() } };
  }

  @Post("site-settings")
  async updateSiteSettings(@Body() body: SiteSettingsBody) {
    const patch: any = {};

    // New structured payload (preferred).
    if (body.features || body.branding || body.support || body.discover || body.banners) {
      if (body.features) patch.features = body.features;
      if (body.branding) patch.branding = body.branding;
      if (body.support) patch.support = body.support;
      if (body.discover) patch.discover = body.discover;
      if (body.banners) patch.banners = body.banners;
    }

    // Legacy flat payload -> map into structured patch.
    if (typeof body.enableSolanaLogin === "boolean") {
      patch.features = { ...(patch.features ?? {}), enableSolanaLogin: body.enableSolanaLogin };
    }
    if (typeof body.appName === "string") {
      patch.branding = { ...(patch.branding ?? {}), appName: body.appName };
    }
    if (typeof body.contactEmail === "string") {
      patch.support = { ...(patch.support ?? {}), email: body.contactEmail };
    }
    if (typeof body.contactWeChat === "string") {
      patch.support = { ...(patch.support ?? {}), wechat: body.contactWeChat };
    }
    if (typeof body.contactTelegram === "string") {
      patch.support = { ...(patch.support ?? {}), telegram: body.contactTelegram };
    }
    if (Array.isArray(body.discoverTags)) {
      patch.discover = { ...(patch.discover ?? {}), tags: body.discoverTags };
    }
    if (Array.isArray(body.discoverLounges)) {
      patch.discover = { ...(patch.discover ?? {}), lounges: body.discoverLounges };
    }

    // `adsEnabled` legacy: best-effort map to "enable/disable all slots".
    if (typeof body.adsEnabled === "boolean") {
      patch.banners = {
        slots: {
          "chats-top": { enabled: body.adsEnabled },
          "contacts-middle": { enabled: body.adsEnabled },
          "discover-menu-top": { enabled: body.adsEnabled },
          "moments-feed-top": { enabled: body.adsEnabled }
        }
      };
    }

    const updated = await this.siteSettings.patchPublicConfig(patch);
    return { ok: true as const, ...updated, meta: { updatedAt: this.siteSettings.getUpdatedAt() } };
  }

  @Get("overview")
  getOverview() {
    return { ok: true as const, ...this.store.getAdminOverviewCounts() };
  }

  @Get("audit-logs")
  getAuditLogs(
    @Query("limit") limitRaw?: string,
    @Query("offset") offsetRaw?: string,
    @Query("action") action?: string,
    @Query("targetType") targetType?: string,
    @Query("startAt") startAt?: string,
    @Query("endAt") endAt?: string
  ) {
    const parsedLimit = limitRaw !== undefined ? Number.parseInt(limitRaw, 10) : 20;
    const parsedOffset = offsetRaw !== undefined ? Number.parseInt(offsetRaw, 10) : 0;
    const limit = Number.isFinite(parsedLimit) ? parsedLimit : 20;
    const offset = Number.isFinite(parsedOffset) ? parsedOffset : 0;
    const { items, total } = this.store.listAuditLogs({
      limit,
      offset,
      action,
      targetType,
      startAt,
      endAt
    });
    return { ok: true as const, items, total, offset, limit };
  }

  @Get("auth-state")
  getAuthState() {
    return { ok: true as const, usingDefaultToken: this.adminToken.isUsingDefaultToken() };
  }

  @Post("token")
  rotateAdminToken(@Body() body: RotateAdminTokenBody) {
    const nextToken = body.token?.trim();
    if (!nextToken) {
      throw new BadRequestException({ message: "新管理密钥不能为空", code: "ADMIN_TOKEN_EMPTY" });
    }
    if (nextToken.length < 4) {
      throw new BadRequestException({ message: "新管理密钥至少 4 位", code: "ADMIN_TOKEN_TOO_SHORT" });
    }
    this.adminToken.rotate(nextToken);
    return { ok: true as const, usingDefaultToken: false };
  }
}
