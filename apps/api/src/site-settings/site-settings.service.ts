import { Inject, Injectable } from "@nestjs/common";

import { createDefaultPublicConfig } from "./default-public-config";
import {
  SITE_SETTINGS_REPOSITORY,
  type SiteSettingsRepository
} from "./site-settings.repository";
import type { BannerSlot, HotBoardConfig, HotBoardSection, PublicConfig } from "./site-settings.types";

const BANNER_SLOTS: BannerSlot[] = [
  "chats-top",
  "contacts-middle",
  "discover-menu-top",
  "moments-feed-top"
];

type PublicConfigPatch = Partial<{
  features: Partial<PublicConfig["features"]>;
  branding: Partial<PublicConfig["branding"]>;
  support: Partial<PublicConfig["support"]>;
  discover: Partial<Omit<PublicConfig["discover"], "lounges" | "cards" | "tags" | "hot">> & {
    tags?: string[];
    lounges?: PublicConfig["discover"]["lounges"];
    cards?: PublicConfig["discover"]["cards"];
    hot?: Partial<HotBoardConfig> & {
      moments?: Partial<HotBoardSection>;
      groups?: Partial<HotBoardSection>;
      recommendedUsers?: Partial<HotBoardSection>;
    };
  };
  banners: {
    slots: Partial<Record<BannerSlot, Partial<PublicConfig["banners"]["slots"][BannerSlot]>>>;
  };
}>;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeString(value: unknown, fallback: string) {
  return isNonEmptyString(value) ? value.trim() : fallback;
}

function normalizeStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const list = value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean);
  return list.length ? list : fallback;
}

function clampHotLimit(value: unknown, fallback: number) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(20, Math.max(0, Math.floor(n)));
}

function mergeHotSection(current: HotBoardSection, patch: Partial<HotBoardSection> | undefined): HotBoardSection {
  if (!patch) return current;
  return {
    enabled: patch.enabled !== undefined ? Boolean(patch.enabled) : current.enabled,
    titleZh: patch.titleZh !== undefined ? normalizeString(patch.titleZh, current.titleZh) : current.titleZh,
    titleEn: patch.titleEn !== undefined ? normalizeString(patch.titleEn, current.titleEn) : current.titleEn,
    limit: patch.limit !== undefined ? clampHotLimit(patch.limit, current.limit) : current.limit
  };
}

function mergeHotBoard(current: HotBoardConfig, patch: Partial<HotBoardConfig> | undefined): HotBoardConfig {
  if (!patch) return current;
  return {
    enabled: patch.enabled !== undefined ? Boolean(patch.enabled) : current.enabled,
    titleZh: patch.titleZh !== undefined ? normalizeString(patch.titleZh, current.titleZh) : current.titleZh,
    titleEn: patch.titleEn !== undefined ? normalizeString(patch.titleEn, current.titleEn) : current.titleEn,
    hintZh: patch.hintZh !== undefined ? normalizeString(patch.hintZh, current.hintZh) : current.hintZh,
    hintEn: patch.hintEn !== undefined ? normalizeString(patch.hintEn, current.hintEn) : current.hintEn,
    moments: mergeHotSection(current.moments, patch.moments),
    groups: mergeHotSection(current.groups, patch.groups),
    recommendedUsers: mergeHotSection(current.recommendedUsers, patch.recommendedUsers)
  };
}

/** 三个子榜全关时，总开关必须为关，避免存储与前台逻辑不一致 */
function coerceHotBoardMasterSwitch(hot: HotBoardConfig): HotBoardConfig {
  const anySubsection = hot.moments.enabled || hot.groups.enabled || hot.recommendedUsers.enabled;
  if (!anySubsection && hot.enabled) {
    return { ...hot, enabled: false };
  }
  return hot;
}

function mergePublicConfig(base: PublicConfig, patch: PublicConfigPatch): PublicConfig {
  const next: PublicConfig = structuredClone(base);

  if (patch.features?.enableSolanaLogin !== undefined) {
    next.features.enableSolanaLogin = Boolean(patch.features.enableSolanaLogin);
  }

  if (patch.branding) {
    if (patch.branding.appName !== undefined) {
      next.branding.appName = normalizeString(patch.branding.appName, next.branding.appName);
    }
    if (patch.branding.logoUrl !== undefined) {
      next.branding.logoUrl = typeof patch.branding.logoUrl === "string" ? patch.branding.logoUrl.trim() : "";
    }
    if (patch.branding.themeColor !== undefined) {
      next.branding.themeColor = normalizeString(patch.branding.themeColor, next.branding.themeColor);
    }
  }

  if (patch.support) {
    if (patch.support.email !== undefined) {
      next.support.email = normalizeString(patch.support.email, next.support.email);
    }
    if (patch.support.wechat !== undefined) {
      next.support.wechat = normalizeString(patch.support.wechat, next.support.wechat);
    }
    if (patch.support.telegram !== undefined) {
      next.support.telegram = normalizeString(patch.support.telegram, next.support.telegram);
    }
    if (patch.support.websiteUrl !== undefined) {
      next.support.websiteUrl = typeof patch.support.websiteUrl === "string" ? patch.support.websiteUrl.trim() : "";
    }
    if (patch.support.xUrl !== undefined) {
      next.support.xUrl = typeof patch.support.xUrl === "string" ? patch.support.xUrl.trim() : "";
    }
    if (patch.support.discordUrl !== undefined) {
      next.support.discordUrl = typeof patch.support.discordUrl === "string" ? patch.support.discordUrl.trim() : "";
    }
  }

  if (patch.discover) {
    if (patch.discover.tags !== undefined) {
      next.discover.tags = normalizeStringArray(patch.discover.tags, next.discover.tags);
    }
    if (patch.discover.lounges !== undefined && Array.isArray(patch.discover.lounges)) {
      const lounges = patch.discover.lounges
        .map((item) => ({
          name: normalizeString(item?.name, ""),
          members: normalizeString(item?.members, ""),
          activeZh: normalizeString(item?.activeZh, ""),
          activeEn: normalizeString(item?.activeEn, "")
        }))
        .filter((item) => item.name && item.members && item.activeZh && item.activeEn);
      if (lounges.length) next.discover.lounges = lounges;
    }
    if (patch.discover.cards !== undefined && Array.isArray(patch.discover.cards)) {
      const cards = patch.discover.cards
        .map((item) => ({
          id: normalizeString(item?.id, ""),
          visible: Boolean(item?.visible),
          titleZh: normalizeString(item?.titleZh, ""),
          titleEn: normalizeString(item?.titleEn, ""),
          subtitleZh: normalizeString(item?.subtitleZh, ""),
          subtitleEn: normalizeString(item?.subtitleEn, ""),
          action: item?.action === "openMoments" ? "openMoments" : null
        }))
        .filter((item) => item.id && item.titleZh && item.titleEn && item.subtitleZh && item.subtitleEn && item.action)
        .map((item) => ({
          id: item.id,
          visible: item.visible,
          titleZh: item.titleZh,
          titleEn: item.titleEn,
          subtitleZh: item.subtitleZh,
          subtitleEn: item.subtitleEn,
          action: item.action as "openMoments"
        }));
      if (cards.length) next.discover.cards = cards;
    }
    if (patch.discover.hot !== undefined && typeof patch.discover.hot === "object") {
      next.discover.hot = mergeHotBoard(next.discover.hot, patch.discover.hot);
    }
  }

  const slotsPatch = patch.banners?.slots;
  if (slotsPatch && typeof slotsPatch === "object") {
    for (const slot of BANNER_SLOTS) {
      const value = slotsPatch[slot];
      if (!value) continue;
      const current = next.banners.slots[slot];
      next.banners.slots[slot] = {
        enabled: value.enabled !== undefined ? Boolean(value.enabled) : current.enabled,
        titleZh: value.titleZh !== undefined ? normalizeString(value.titleZh, current.titleZh) : current.titleZh,
        titleEn: value.titleEn !== undefined ? normalizeString(value.titleEn, current.titleEn) : current.titleEn,
        descriptionZh:
          value.descriptionZh !== undefined
            ? normalizeString(value.descriptionZh, current.descriptionZh)
            : current.descriptionZh,
        descriptionEn:
          value.descriptionEn !== undefined
            ? normalizeString(value.descriptionEn, current.descriptionEn)
            : current.descriptionEn
      };
    }
  }

  next.discover.hot = coerceHotBoardMasterSwitch(next.discover.hot);
  return next;
}

@Injectable()
export class SiteSettingsService {
  private memoryFallback: PublicConfig = createDefaultPublicConfig({
    enableSolanaLogin: process.env.ENABLE_SOLANA_LOGIN,
    appPublicName: process.env.APP_PUBLIC_NAME
  });
  private updatedAt: string | null = null;

  constructor(
    @Inject(SITE_SETTINGS_REPOSITORY)
    private readonly repository: SiteSettingsRepository
  ) {}

  async getPublicConfig(): Promise<PublicConfig> {
    const base = createDefaultPublicConfig({
      enableSolanaLogin: process.env.ENABLE_SOLANA_LOGIN,
      appPublicName: process.env.APP_PUBLIC_NAME
    });

    try {
      const data = await this.repository.load();
      if (!data) {
        return mergePublicConfig(base, this.memoryFallback as unknown as PublicConfigPatch);
      }
      return mergePublicConfig(base, data as unknown as PublicConfigPatch);
    } catch {
      // DB not ready / migration not applied / connection issues -> fallback to memory config
      return mergePublicConfig(base, this.memoryFallback as unknown as PublicConfigPatch);
    }
  }

  async patchPublicConfig(patch: PublicConfigPatch): Promise<PublicConfig> {
    const current = await this.getPublicConfig();
    const next = mergePublicConfig(current, patch);

    this.memoryFallback = next;
    await this.repository.save(next as unknown as Record<string, unknown>);
    this.updatedAt = new Date().toISOString();
    return next;
  }

  getUpdatedAt() {
    return this.updatedAt;
  }
}

