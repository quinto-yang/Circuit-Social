export type SitePublicConfig = {
  // legacy flat fields (still used across AppShell)
  enableSolanaLogin: boolean;
  adsEnabled: boolean;
  appName: string;
  contactEmail: string;
  contactWeChat: string;
  contactTelegram: string;
  discoverTags: string[];
  discoverLounges: Array<{ name: string; members: string; activeZh: string; activeEn: string }>;
  banners: Record<
    "chats-top" | "contacts-middle" | "discover-menu-top" | "moments-feed-top",
    { titleZh: string; titleEn: string; descriptionZh: string; descriptionEn: string }
  >;

  // new structured shape (for future migration)
  features: { enableSolanaLogin: boolean };
  branding: { appName: string; logoUrl: string; themeColor: string };
  support: {
    email: string;
    wechat: string;
    telegram: string;
    websiteUrl: string;
    xUrl: string;
    discordUrl: string;
  };
  bannerSettings: {
    slots: Record<
      "chats-top" | "contacts-middle" | "discover-menu-top" | "moments-feed-top",
      { enabled: boolean; titleZh: string; titleEn: string; descriptionZh: string; descriptionEn: string }
    >;
  };
  discover: {
    tags: string[];
    lounges: Array<{ name: string; members: string; activeZh: string; activeEn: string }>;
    cards: Array<{
      id: string;
      visible: boolean;
      titleZh: string;
      titleEn: string;
      subtitleZh: string;
      subtitleEn: string;
      action: "openMoments";
    }>;
    hot: {
      enabled: boolean;
      titleZh: string;
      titleEn: string;
      hintZh: string;
      hintEn: string;
      moments: { enabled: boolean; titleZh: string; titleEn: string; limit: number };
      groups: { enabled: boolean; titleZh: string; titleEn: string; limit: number };
      recommendedUsers: { enabled: boolean; titleZh: string; titleEn: string; limit: number };
    };
  };
};

export function defaultSitePublic(): SitePublicConfig {
  return {
    enableSolanaLogin: false,
    adsEnabled: false,
    appName: "Circuit Social",
    contactEmail: "support@circuit.social",
    contactWeChat: "CircuitSocial",
    contactTelegram: "@CircuitSocial",
    discoverTags: ["兴趣圈", "Builder", "活动", "Mini Apps"],
    discoverLounges: [
      { name: "Builder Lounge", members: "1.2k", activeZh: "高活跃", activeEn: "High activity" },
      { name: "Circuit Growth", members: "820", activeZh: "上升中", activeEn: "Rising" },
      { name: "Chain Study Club", members: "540", activeZh: "稳定讨论", activeEn: "Steady" }
    ],
    banners: {
      "chats-top": { titleZh: "", titleEn: "", descriptionZh: "", descriptionEn: "" },
      "contacts-middle": { titleZh: "", titleEn: "", descriptionZh: "", descriptionEn: "" },
      "discover-menu-top": { titleZh: "", titleEn: "", descriptionZh: "", descriptionEn: "" },
      "moments-feed-top": { titleZh: "", titleEn: "", descriptionZh: "", descriptionEn: "" }
    },
    features: { enableSolanaLogin: false },
    branding: { appName: "Circuit Social", logoUrl: "", themeColor: "#22c55e" },
    support: {
      email: "support@circuit.social",
      wechat: "CircuitSocial",
      telegram: "@CircuitSocial",
      websiteUrl: "",
      xUrl: "",
      discordUrl: ""
    },
    bannerSettings: {
      slots: {
        "chats-top": { enabled: false, titleZh: "", titleEn: "", descriptionZh: "", descriptionEn: "" },
        "contacts-middle": { enabled: false, titleZh: "", titleEn: "", descriptionZh: "", descriptionEn: "" },
        "discover-menu-top": { enabled: false, titleZh: "", titleEn: "", descriptionZh: "", descriptionEn: "" },
        "moments-feed-top": { enabled: false, titleZh: "", titleEn: "", descriptionZh: "", descriptionEn: "" }
      }
    },
    discover: {
      tags: ["兴趣圈", "Builder", "活动", "Mini Apps"],
      lounges: [
        { name: "Builder Lounge", members: "1.2k", activeZh: "高活跃", activeEn: "High activity" },
        { name: "Circuit Growth", members: "820", activeZh: "上升中", activeEn: "Rising" },
        { name: "Chain Study Club", members: "540", activeZh: "稳定讨论", activeEn: "Steady" }
      ],
      cards: [
        {
          id: "moments",
          visible: true,
          titleZh: "朋友圈",
          titleEn: "Moments",
          subtitleZh: "查看与发布链上动态",
          subtitleEn: "View and publish on-chain updates",
          action: "openMoments"
        }
      ],
      hot: {
        enabled: true,
        titleZh: "热榜",
        titleEn: "Hot right now",
        hintZh: "真实数据",
        hintEn: "Real data",
        moments: { enabled: true, titleZh: "热帖", titleEn: "Hot moments", limit: 3 },
        groups: { enabled: true, titleZh: "热群（真实互动）", titleEn: "Hot groups (live)", limit: 5 },
        recommendedUsers: { enabled: true, titleZh: "推荐用户", titleEn: "Recommended users", limit: 6 }
      }
    }
  };
}

export function mergeDiscoverHot(
  incoming: SitePublicConfig["discover"]["hot"] | undefined
): SitePublicConfig["discover"]["hot"] {
  const base = defaultSitePublic().discover.hot;
  if (!incoming) return base;
  const clamp = (n: number, fb: number) =>
    Number.isFinite(n) ? Math.min(20, Math.max(0, Math.floor(n))) : fb;
  const merged: SitePublicConfig["discover"]["hot"] = {
    enabled: typeof incoming.enabled === "boolean" ? incoming.enabled : base.enabled,
    titleZh: typeof incoming.titleZh === "string" ? incoming.titleZh : base.titleZh,
    titleEn: typeof incoming.titleEn === "string" ? incoming.titleEn : base.titleEn,
    hintZh: typeof incoming.hintZh === "string" ? incoming.hintZh : base.hintZh,
    hintEn: typeof incoming.hintEn === "string" ? incoming.hintEn : base.hintEn,
    moments: {
      enabled: typeof incoming.moments?.enabled === "boolean" ? incoming.moments.enabled : base.moments.enabled,
      titleZh: typeof incoming.moments?.titleZh === "string" ? incoming.moments.titleZh : base.moments.titleZh,
      titleEn: typeof incoming.moments?.titleEn === "string" ? incoming.moments.titleEn : base.moments.titleEn,
      limit:
        incoming.moments?.limit !== undefined
          ? clamp(incoming.moments.limit, base.moments.limit)
          : base.moments.limit
    },
    groups: {
      enabled: typeof incoming.groups?.enabled === "boolean" ? incoming.groups.enabled : base.groups.enabled,
      titleZh: typeof incoming.groups?.titleZh === "string" ? incoming.groups.titleZh : base.groups.titleZh,
      titleEn: typeof incoming.groups?.titleEn === "string" ? incoming.groups.titleEn : base.groups.titleEn,
      limit:
        incoming.groups?.limit !== undefined
          ? clamp(incoming.groups.limit, base.groups.limit)
          : base.groups.limit
    },
    recommendedUsers: {
      enabled:
        typeof incoming.recommendedUsers?.enabled === "boolean"
          ? incoming.recommendedUsers.enabled
          : base.recommendedUsers.enabled,
      titleZh:
        typeof incoming.recommendedUsers?.titleZh === "string"
          ? incoming.recommendedUsers.titleZh
          : base.recommendedUsers.titleZh,
      titleEn:
        typeof incoming.recommendedUsers?.titleEn === "string"
          ? incoming.recommendedUsers.titleEn
          : base.recommendedUsers.titleEn,
      limit:
        incoming.recommendedUsers?.limit !== undefined
          ? clamp(incoming.recommendedUsers.limit, base.recommendedUsers.limit)
          : base.recommendedUsers.limit
    }
  };
  const anySub = merged.moments.enabled || merged.groups.enabled || merged.recommendedUsers.enabled;
  if (!anySub && merged.enabled) {
    return { ...merged, enabled: false };
  }
  return merged;
}

/** Master on and at least one subsection on — avoids an empty card when all sub-blocks are disabled in admin. */
export function isDiscoverHotBoardVisible(hot: SitePublicConfig["discover"]["hot"]): boolean {
  if (!hot.enabled) return false;
  return hot.moments.enabled || hot.groups.enabled || hot.recommendedUsers.enabled;
}

export function coerceSitePublic(raw: Record<string, unknown> | null): SitePublicConfig {
  const fallback = defaultSitePublic();
  if (!raw) return fallback;
  const hasNewShape =
    raw.features && typeof raw.features === "object" && raw.branding && typeof raw.branding === "object";
  if (hasNewShape) {
    const next = { ...(raw as SitePublicConfig) };
    next.enableSolanaLogin = next.features?.enableSolanaLogin ?? false;
    next.adsEnabled = Object.values(next.bannerSettings?.slots ?? {}).some((slot) => slot.enabled);
    next.appName = next.branding?.appName ?? fallback.appName;
    next.contactEmail = next.support?.email ?? fallback.contactEmail;
    next.contactWeChat = next.support?.wechat ?? fallback.contactWeChat;
    next.contactTelegram = next.support?.telegram ?? fallback.contactTelegram;
    next.discoverTags = next.discover?.tags ?? fallback.discoverTags;
    next.discoverLounges = next.discover?.lounges ?? fallback.discoverLounges;
    next.discover = {
      ...fallback.discover,
      ...next.discover,
      hot: mergeDiscoverHot(next.discover?.hot)
    };
    next.banners = {
      "chats-top": next.bannerSettings?.slots?.["chats-top"] ?? fallback.banners["chats-top"],
      "contacts-middle": next.bannerSettings?.slots?.["contacts-middle"] ?? fallback.banners["contacts-middle"],
      "discover-menu-top":
        next.bannerSettings?.slots?.["discover-menu-top"] ?? fallback.banners["discover-menu-top"],
      "moments-feed-top":
        next.bannerSettings?.slots?.["moments-feed-top"] ?? fallback.banners["moments-feed-top"]
    };
    return next;
  }

  // legacy flatten payload fallback
  const adsEnabled = Boolean((raw as any).adsEnabled);
  const appName =
    typeof (raw as any).appName === "string" ? String((raw as any).appName) : fallback.branding.appName;
  const enableSolanaLogin = Boolean((raw as any).enableSolanaLogin);
  const email =
    typeof (raw as any).contactEmail === "string" ? String((raw as any).contactEmail) : fallback.support.email;
  const wechat =
    typeof (raw as any).contactWeChat === "string" ? String((raw as any).contactWeChat) : fallback.support.wechat;
  const telegram =
    typeof (raw as any).contactTelegram === "string"
      ? String((raw as any).contactTelegram)
      : fallback.support.telegram;
  const tags = Array.isArray((raw as any).discoverTags)
    ? (raw as any).discoverTags.filter((x: unknown) => typeof x === "string")
    : fallback.discover.tags;
  const lounges = Array.isArray((raw as any).discoverLounges)
    ? ((raw as any).discoverLounges as any)
    : fallback.discover.lounges;
  const bannersLegacy =
    (raw as any).banners && typeof (raw as any).banners === "object" ? (raw as any).banners : null;

  const next = defaultSitePublic();
  next.enableSolanaLogin = enableSolanaLogin;
  next.adsEnabled = adsEnabled;
  next.appName = appName;
  next.contactEmail = email;
  next.contactWeChat = wechat;
  next.contactTelegram = telegram;
  next.discoverTags = tags;
  next.discoverLounges = lounges;
  next.features.enableSolanaLogin = enableSolanaLogin;
  next.branding.appName = appName;
  next.support.email = email;
  next.support.wechat = wechat;
  next.support.telegram = telegram;
  next.discover.tags = tags;
  next.discover.lounges = lounges;
  for (const slot of ["chats-top", "contacts-middle", "discover-menu-top", "moments-feed-top"] as const) {
    next.bannerSettings.slots[slot].enabled = adsEnabled;
    if (bannersLegacy?.[slot]) {
      next.bannerSettings.slots[slot].titleZh = String(bannersLegacy[slot].titleZh ?? "");
      next.bannerSettings.slots[slot].titleEn = String(bannersLegacy[slot].titleEn ?? "");
      next.bannerSettings.slots[slot].descriptionZh = String(bannersLegacy[slot].descriptionZh ?? "");
      next.bannerSettings.slots[slot].descriptionEn = String(bannersLegacy[slot].descriptionEn ?? "");
    }
    next.banners[slot] = {
      titleZh: next.bannerSettings.slots[slot].titleZh,
      titleEn: next.bannerSettings.slots[slot].titleEn,
      descriptionZh: next.bannerSettings.slots[slot].descriptionZh,
      descriptionEn: next.bannerSettings.slots[slot].descriptionEn
    };
  }
  return next;
}

