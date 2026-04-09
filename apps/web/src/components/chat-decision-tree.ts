export type DecisionAction = "profile" | "add-friend" | "create-group" | "join-group" | "discover" | "contacts";

export type DecisionContext = {
  profileIncomplete?: boolean;
  friendCount?: number;
  groupCount?: number;
};

type DecisionQuestion = {
  id: string;
  askZh: string;
  askEn: string;
  learnZh: string;
  learnEn: string;
  action: DecisionAction;
  actionLabelZh: string;
  actionLabelEn: string;
};

type DecisionSectionConfig = {
  id: string;
  titleZh: string;
  titleEn: string;
  priority: (ctx?: DecisionContext) => number;
  questions: DecisionQuestion[];
};

export type RecentDecisionPath = {
  sectionId: string;
  questionId: string;
  action: DecisionAction;
  questionLabel: string;
  updatedAt: string;
};

export const CONCIERGE_DECISION_TREE: DecisionSectionConfig[] = [
  {
    id: "identity",
    titleZh: "身份设置",
    titleEn: "Identity setup",
    priority: (ctx) => (ctx?.profileIncomplete ? 0 : 2),
    questions: [
      {
        id: "identity-complete",
        askZh: "如何完善我的链上身份资料？",
        askEn: "How do I complete my on-chain profile?",
        learnZh: "前往“我的”页补充昵称、简介与 DID，即可提升推荐和可信度。",
        learnEn: "Go to Me page and complete nickname, bio, and DID for better trust and recommendations.",
        action: "profile",
        actionLabelZh: "去完善资料",
        actionLabelEn: "Open profile"
      }
    ]
  },
  {
    id: "social",
    titleZh: "社交关系",
    titleEn: "Social connections",
    priority: (ctx) => ((ctx?.friendCount ?? 0) === 0 ? 0 : 1),
    questions: [
      {
        id: "social-add-friend",
        askZh: "我想先添加一个好友",
        askEn: "I want to add a friend first",
        learnZh: "支持通过用户 ID 或钱包地址发起好友申请。",
        learnEn: "You can add friends by user ID or wallet address.",
        action: "add-friend",
        actionLabelZh: "去添加好友",
        actionLabelEn: "Add friend"
      },
      {
        id: "social-create-group",
        askZh: "如何创建群聊并邀请朋友？",
        askEn: "How do I create a group and invite friends?",
        learnZh: "创建群聊后会生成 8 位邀请码，复制后可直接分享给朋友。",
        learnEn: "Creating a group generates an 8-char invite code that you can share instantly.",
        action: "create-group",
        actionLabelZh: "去创建群聊",
        actionLabelEn: "Create group"
      },
      {
        id: "social-join-group",
        askZh: "我有邀请码，怎么加入群聊？",
        askEn: "I have an invite code, how do I join?",
        learnZh: "输入群主提供的邀请码即可快速加入并开始会话。",
        learnEn: "Enter the invite code from owner to join instantly.",
        action: "join-group",
        actionLabelZh: "去加入群聊",
        actionLabelEn: "Join group"
      }
    ]
  },
  {
    id: "explore",
    titleZh: "玩法探索",
    titleEn: "Explore",
    priority: (ctx) => ((ctx?.groupCount ?? 0) > 0 ? 1 : 2),
    questions: [
      {
        id: "explore-lounge",
        askZh: "想看看 Lounge 里有什么",
        askEn: "Show me Lounge",
        learnZh: "在发现页可查看动态、社区讨论与公开内容入口。",
        learnEn: "Discover tab contains feeds, communities and public content.",
        action: "discover",
        actionLabelZh: "去发现页",
        actionLabelEn: "Open discover"
      },
      {
        id: "explore-contacts-actions",
        askZh: "还有哪些快捷操作？",
        askEn: "Any more quick actions?",
        learnZh: "通讯录动作菜单提供加好友、建群、入群和新朋友处理。",
        learnEn: "Contacts menu includes add friend, create/join group and requests.",
        action: "contacts",
        actionLabelZh: "打开更多操作",
        actionLabelEn: "Open actions"
      }
    ]
  },
  {
    id: "safety",
    titleZh: "安全问题",
    titleEn: "Security FAQ",
    priority: () => 3,
    questions: [
      {
        id: "safe-sign",
        askZh: "签名登录安全吗？",
        askEn: "Is wallet sign-in safe?",
        learnZh: "签名仅用于身份验证，不会转账，也不会读取私钥。",
        learnEn: "Signing is only for identity verification; no transfer or private key access.",
        action: "profile",
        actionLabelZh: "查看安全设置",
        actionLabelEn: "Review settings"
      },
      {
        id: "safe-login-fail",
        askZh: "为什么连接钱包后还是登录失败？",
        askEn: "Why does sign-in fail after wallet connect?",
        learnZh: "常见原因是网络不匹配、签名被拒绝或会话过期，可先重试并检查网络。",
        learnEn: "Most failures come from chain mismatch, rejected sign, or expired session. Retry and check chain.",
        action: "contacts",
        actionLabelZh: "打开排查入口",
        actionLabelEn: "Open troubleshooting"
      },
      {
        id: "safe-switch",
        askZh: "如何切换网络或钱包？",
        askEn: "How to switch network or wallet?",
        learnZh: "切换网络后建议重新连接钱包并发起新签名，确保会话一致。",
        learnEn: "After switching chain, reconnect wallet and sign again for a consistent session.",
        action: "contacts",
        actionLabelZh: "打开钱包操作",
        actionLabelEn: "Open wallet actions"
      }
    ]
  }
];

