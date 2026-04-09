import type { BannerSlot, PublicConfig } from "./site-settings.types";

const DEFAULT_SLOTS: BannerSlot[] = [
  "chats-top",
  "contacts-middle",
  "discover-menu-top",
  "moments-feed-top"
];

export function createDefaultPublicConfig(env?: {
  enableSolanaLogin?: string;
  appPublicName?: string;
}): PublicConfig {
  const appName = env?.appPublicName?.trim() || "Circuit Social";
  const enableSolanaLogin = env?.enableSolanaLogin === "true";

  const slots = Object.fromEntries(
    DEFAULT_SLOTS.map((slot) => [
      slot,
      {
        enabled: false,
        titleZh: "",
        titleEn: "",
        descriptionZh: "",
        descriptionEn: ""
      }
    ])
  ) as PublicConfig["banners"]["slots"];

  slots["chats-top"] = {
    enabled: false,
    titleZh: "Circuit Social：链上身份驱动的社交协作",
    titleEn: "Circuit Social: On-chain identity for social collaboration",
    descriptionZh: "用钱包完成身份登录，在同一入口管理私聊、群聊与社区协作。",
    descriptionEn: "Sign in with wallet and manage DMs, groups, and collaboration in one place."
  };

  slots["contacts-middle"] = {
    enabled: false,
    titleZh: "一键连接关系与群组网络",
    titleEn: "Connect people and groups quickly",
    descriptionZh: "支持加好友、建群、入群与群管理，快速搭建稳定的协作圈层。",
    descriptionEn: "Add friends, create/join groups, and manage members efficiently."
  };

  slots["discover-menu-top"] = {
    enabled: false,
    titleZh: "发现页：内容分发与社区增长入口",
    titleEn: "Discover: content and growth entry",
    descriptionZh: "朋友圈支持图文发布、互动扩散与关系沉淀，帮助内容触达更多人。",
    descriptionEn: "Moments supports image/text posting and social engagement."
  };

  slots["moments-feed-top"] = {
    enabled: false,
    titleZh: "朋友圈：轻内容表达 + 社交关系沉淀",
    titleEn: "Moments: lightweight content with social growth",
    descriptionZh: "选图即上传、实时展示进度，发布后即时触达好友与社群。",
    descriptionEn: "Upload with progress and reach friends/community instantly."
  };

  return {
    features: { enableSolanaLogin },
    branding: {
      appName,
      logoUrl: "",
      themeColor: "#22c55e"
    },
    support: {
      email: "support@circuit.social",
      wechat: "CircuitSocial",
      telegram: "@CircuitSocial",
      websiteUrl: "",
      xUrl: "",
      discordUrl: ""
    },
    banners: { slots },
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
        moments: {
          enabled: true,
          titleZh: "热帖",
          titleEn: "Hot moments",
          limit: 3
        },
        groups: {
          enabled: true,
          titleZh: "热群（真实互动）",
          titleEn: "Hot groups (live)",
          limit: 5
        },
        recommendedUsers: {
          enabled: true,
          titleZh: "推荐用户",
          titleEn: "Recommended users",
          limit: 6
        }
      }
    }
  };
}

