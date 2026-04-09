export type BannerSlot = "chats-top" | "contacts-middle" | "discover-menu-top" | "moments-feed-top";

export type BannerSlotConfig = {
  enabled: boolean;
  titleZh: string;
  titleEn: string;
  descriptionZh: string;
  descriptionEn: string;
};

export type SupportLinks = {
  email: string;
  wechat: string;
  telegram: string;
  websiteUrl: string;
  xUrl: string;
  discordUrl: string;
};

export type BrandingConfig = {
  appName: string;
  logoUrl: string;
  themeColor: string;
};

export type DiscoverCardAction = "openMoments";

export type DiscoverCard = {
  id: string;
  visible: boolean;
  titleZh: string;
  titleEn: string;
  subtitleZh: string;
  subtitleEn: string;
  action: DiscoverCardAction;
};

export type DiscoverLounge = {
  name: string;
  members: string;
  activeZh: string;
  activeEn: string;
};

/** 发现页「热榜」区块：数据仍来自 /discover/hot，此处配置展示文案与各子榜条数/显隐 */
export type HotBoardSection = {
  enabled: boolean;
  titleZh: string;
  titleEn: string;
  /** 展示条数上限，0–20 */
  limit: number;
};

export type HotBoardConfig = {
  enabled: boolean;
  titleZh: string;
  titleEn: string;
  hintZh: string;
  hintEn: string;
  moments: HotBoardSection;
  groups: HotBoardSection;
  recommendedUsers: HotBoardSection;
};

export type DiscoverConfig = {
  tags: string[];
  lounges: DiscoverLounge[];
  cards: DiscoverCard[];
  hot: HotBoardConfig;
};

export type PublicConfig = {
  branding: BrandingConfig;
  support: SupportLinks;
  banners: {
    slots: Record<BannerSlot, BannerSlotConfig>;
  };
  discover: DiscoverConfig;
  features: {
    enableSolanaLogin: boolean;
  };
};

