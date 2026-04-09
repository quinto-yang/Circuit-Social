import { Injectable } from "@nestjs/common";
import { randomBytes, randomUUID } from "node:crypto";

import type {
  AuditLogRecord,
  ConversationMemberRecord,
  ConversationRecord,
  ConversationSummary,
  FriendRequestRecord,
  FriendRequestView,
  MessageRecord,
  MessageView,
  MomentCommentRecord,
  MomentCommentView,
  MomentRecord,
  MomentView,
  NonceRecord,
  PublicUser,
  ReportRecord,
  SessionRecord,
  TenantAppRecord,
  TenantBrandingRecord,
  TenantDomainRecord,
  TenantKeyRecord,
  SitePublicSettings,
  SiteBannerSlot,
  SiteBannerItem,
  UploadRecord,
  UserRecord,
  WalletRecord
} from "./store.types";

const PRIMARY_CHAIN_ID = 8453;
const PRIMARY_CHAIN_LABEL = "Base";
const TEST_WALLET_PRESETS = {
  "fresh-user": "0x1111111111111111111111111111111111111111",
  concierge: "0x000000000000000000000000000000000000c0de",
  guide: "0x000000000000000000000000000000000000beef"
} as const;

const SITE_BANNER_SLOTS: SiteBannerSlot[] = [
  "chats-top",
  "contacts-middle",
  "discover-menu-top",
  "moments-feed-top"
];

export type TestSessionPreset = keyof typeof TEST_WALLET_PRESETS;

@Injectable()
export class MemoryStoreService {
  private userSeq = 1;
  private walletSeq = 1;
  private requestSeq = 1;
  private conversationSeq = 1;
  private conversationMemberSeq = 1;
  private messageSeq = 1;
  private uploadSeq = 1;
  private momentSeq = 1;
  private momentCommentSeq = 1;
  private reportSeq = 1;
  private auditSeq = 1;
  private tenantAppSeq = 1;
  private tenantDomainSeq = 1;
  private tenantKeySeq = 1;

  private readonly users: UserRecord[] = [];
  private readonly wallets: WalletRecord[] = [];
  private readonly sessions = new Map<string, SessionRecord>();
  private readonly nonces = new Map<string, NonceRecord>();
  private readonly friendRequests: FriendRequestRecord[] = [];
  private readonly friendships = new Set<string>();
  private readonly conversations: ConversationRecord[] = [];
  private readonly conversationMembers: ConversationMemberRecord[] = [];
  private readonly messages: MessageRecord[] = [];
  private readonly uploads: UploadRecord[] = [];
  private readonly moments: MomentRecord[] = [];
  private readonly momentComments: MomentCommentRecord[] = [];
  private readonly momentLikes: Array<{ momentId: number; userId: number; createdAt: string }> = [];
  private readonly momentCommentLikes: Array<{ commentId: number; userId: number; createdAt: string }> = [];
  private momentCommentPins = new Map<number, { momentId: number; commentId: number; pinnedByUserId: number; pinnedAt: string }>();
  private readonly pointLedger: Array<{ userId: number; delta: number; reason: string; refType?: string; refId?: string; createdAt: string }> = [];
  private readonly taskDefinitions: Array<{
    key: string;
    titleZh: string;
    titleEn: string;
    descriptionZh: string;
    descriptionEn: string;
    target: number;
    points: number;
    enabled: boolean;
  }> = [];
  private readonly taskProgress = new Map<string, { userId: number; taskKey: string; progress: number; completedAt: string | null; updatedAt: string }>();
  private readonly reports: ReportRecord[] = [];
  private readonly auditLogs: AuditLogRecord[] = [];
  private readonly tenantApps: TenantAppRecord[] = [];
  private readonly tenantDomains: TenantDomainRecord[] = [];
  private readonly tenantKeys: TenantKeyRecord[] = [];
  private readonly tenantBrandings: TenantBrandingRecord[] = [];
  private sitePublicSettings: SitePublicSettings;

  constructor() {
    this.sitePublicSettings = this.readSiteSettingsFromEnv();
    this.seedSystemData();
  }

  private readSiteSettingsFromEnv(): SitePublicSettings {
    const name = process.env.APP_PUBLIC_NAME?.trim();
    return {
      enableSolanaLogin: process.env.ENABLE_SOLANA_LOGIN === "true",
      adsEnabled: process.env.ADS_ENABLED === "true",
      appName: name && name.length > 0 ? name : "Circuit Social",
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
        "chats-top": {
          titleZh: "Circuit Social：链上身份驱动的社交协作",
          titleEn: "Circuit Social: On-chain identity for social collaboration",
          descriptionZh: "用钱包完成身份登录，在同一入口管理私聊、群聊与社区协作。",
          descriptionEn: "Sign in with wallet and manage DMs, groups, and collaboration in one place."
        },
        "contacts-middle": {
          titleZh: "一键连接关系与群组网络",
          titleEn: "Connect people and groups quickly",
          descriptionZh: "支持加好友、建群、入群与群管理，快速搭建稳定的协作圈层。",
          descriptionEn: "Add friends, create/join groups, and manage members efficiently."
        },
        "discover-menu-top": {
          titleZh: "发现页：内容分发与社区增长入口",
          titleEn: "Discover: content and growth entry",
          descriptionZh: "朋友圈支持图文发布、互动扩散与关系沉淀，帮助内容触达更多人。",
          descriptionEn: "Moments supports image/text posting and social engagement."
        },
        "moments-feed-top": {
          titleZh: "朋友圈：轻内容表达 + 社交关系沉淀",
          titleEn: "Moments: lightweight content with social growth",
          descriptionZh: "选图即上传、实时展示进度，发布后即时触达好友与社群。",
          descriptionEn: "Upload with progress and reach friends/community instantly."
        }
      }
    };
  }

  getSitePublicSettings(): SitePublicSettings {
    return { ...this.sitePublicSettings };
  }

  updateSitePublicSettings(
    patch: Partial<Omit<SitePublicSettings, "banners">> & {
      banners?: Partial<Record<SiteBannerSlot, Partial<SiteBannerItem>>>;
    }
  ): SitePublicSettings {
    const next = { ...this.sitePublicSettings };
    if (typeof patch.enableSolanaLogin === "boolean") {
      next.enableSolanaLogin = patch.enableSolanaLogin;
    }
    if (typeof patch.adsEnabled === "boolean") {
      next.adsEnabled = patch.adsEnabled;
    }
    if (typeof patch.appName === "string") {
      const trimmed = patch.appName.trim();
      if (trimmed.length > 0) {
        next.appName = trimmed;
      }
    }
    if (typeof patch.contactEmail === "string") {
      const trimmed = patch.contactEmail.trim();
      if (trimmed.length > 0) next.contactEmail = trimmed;
    }
    if (typeof patch.contactWeChat === "string") {
      const trimmed = patch.contactWeChat.trim();
      if (trimmed.length > 0) next.contactWeChat = trimmed;
    }
    if (typeof patch.contactTelegram === "string") {
      const trimmed = patch.contactTelegram.trim();
      if (trimmed.length > 0) next.contactTelegram = trimmed;
    }
    if (Array.isArray(patch.discoverTags)) {
      const nextTags = patch.discoverTags
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((item) => item.length > 0);
      if (nextTags.length > 0) {
        next.discoverTags = nextTags;
      }
    }
    if (Array.isArray(patch.discoverLounges)) {
      const lounges = patch.discoverLounges
        .map((item) => ({
          name: typeof item?.name === "string" ? item.name.trim() : "",
          members: typeof item?.members === "string" ? item.members.trim() : "",
          activeZh: typeof item?.activeZh === "string" ? item.activeZh.trim() : "",
          activeEn: typeof item?.activeEn === "string" ? item.activeEn.trim() : ""
        }))
        .filter((item) => item.name && item.members && item.activeZh && item.activeEn);
      if (lounges.length > 0) {
        next.discoverLounges = lounges;
      }
    }
    if (patch.banners && typeof patch.banners === "object") {
      for (const slot of SITE_BANNER_SLOTS) {
        const value = patch.banners[slot];
        if (!value || typeof value !== "object") continue;
        const nextValue = {
          titleZh: typeof value.titleZh === "string" ? value.titleZh.trim() : "",
          titleEn: typeof value.titleEn === "string" ? value.titleEn.trim() : "",
          descriptionZh: typeof value.descriptionZh === "string" ? value.descriptionZh.trim() : "",
          descriptionEn: typeof value.descriptionEn === "string" ? value.descriptionEn.trim() : ""
        };
        if (
          nextValue.titleZh &&
          nextValue.titleEn &&
          nextValue.descriptionZh &&
          nextValue.descriptionEn
        ) {
          next.banners[slot] = nextValue;
        }
      }
    }
    this.sitePublicSettings = next;
    return this.getSitePublicSettings();
  }

  /** 仅管理接口：内存仓储条目计数（开发/运维用） */
  getAdminOverviewCounts() {
    return {
      users: this.users.length,
      wallets: this.wallets.length,
      activeSessions: this.sessions.size,
      conversations: this.conversations.length,
      messages: this.messages.length,
      moments: this.moments.length,
      momentComments: this.momentComments.length,
      friendRequestsPending: this.friendRequests.filter((item) => item.status === "pending").length,
      reports: this.reports.length,
      tenantApps: this.tenantApps.length,
      auditLogEntries: this.auditLogs.length
    };
  }

  /** 最近 N 条审计日志（新在后），上限 100 */
  listRecentAuditLogs(limit: number): AuditLogRecord[] {
    const capped = Math.min(Math.max(1, Math.floor(limit)), 100);
    if (this.auditLogs.length === 0) {
      return [];
    }
    return this.auditLogs.slice(-capped);
  }

  listAuditLogs(input: {
    action?: string;
    targetType?: string;
    startAt?: string;
    endAt?: string;
    offset: number;
    limit: number;
  }): { total: number; items: AuditLogRecord[] } {
    const offset = Math.max(0, Math.floor(input.offset));
    const limit = Math.min(Math.max(1, Math.floor(input.limit)), 100);
    const action = input.action?.trim().toLowerCase();
    const targetType = input.targetType?.trim().toLowerCase();
    const startMs = input.startAt ? new Date(input.startAt).getTime() : null;
    const endMs = input.endAt ? new Date(input.endAt).getTime() : null;

    const filtered = this.auditLogs.filter((item) => {
      if (action && !item.action.toLowerCase().includes(action)) return false;
      if (targetType && !item.targetType.toLowerCase().includes(targetType)) return false;
      const ts = new Date(item.createdAt).getTime();
      if (startMs !== null && Number.isFinite(startMs) && ts < startMs) return false;
      if (endMs !== null && Number.isFinite(endMs) && ts > endMs) return false;
      return true;
    });

    const sorted = filtered.slice().sort((left, right) => {
      if (left.id !== right.id) return right.id - left.id;
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
    const total = sorted.length;
    const items = sorted.slice(offset, offset + limit);
    return { total, items };
  }

  reset() {
    this.userSeq = 1;
    this.walletSeq = 1;
    this.requestSeq = 1;
    this.conversationSeq = 1;
    this.conversationMemberSeq = 1;
    this.messageSeq = 1;
    this.uploadSeq = 1;
    this.momentSeq = 1;
    this.momentCommentSeq = 1;
    this.reportSeq = 1;
    this.auditSeq = 1;
    this.tenantAppSeq = 1;
    this.tenantDomainSeq = 1;
    this.tenantKeySeq = 1;

    this.users.length = 0;
    this.wallets.length = 0;
    this.sessions.clear();
    this.nonces.clear();
    this.friendRequests.length = 0;
    this.friendships.clear();
    this.conversations.length = 0;
    this.conversationMembers.length = 0;
    this.messages.length = 0;
    this.uploads.length = 0;
    this.moments.length = 0;
    this.momentComments.length = 0;
    this.reports.length = 0;
    this.auditLogs.length = 0;
    this.tenantApps.length = 0;
    this.tenantDomains.length = 0;
    this.tenantKeys.length = 0;
    this.tenantBrandings.length = 0;

    this.sitePublicSettings = this.readSiteSettingsFromEnv();
    this.seedSystemData();
  }

  private now() {
    return new Date().toISOString();
  }

  private friendshipKey(a: number, b: number) {
    return a < b ? `${a}:${b}` : `${b}:${a}`;
  }

  private generateInviteCode() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let value = "";
    for (let index = 0; index < 8; index += 1) {
      value += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return value;
  }

  private createUserRecord(input: {
    nickname: string;
    bio?: string;
    avatarUrl?: string | null;
  }) {
    const record: UserRecord = {
      id: this.userSeq++,
      nickname: input.nickname,
      bio: input.bio ?? "",
      avatarUrl: input.avatarUrl ?? null,
      didUri: null,
      encryptionPublicKey: null,
      createdAt: this.now()
    };
    this.users.push(record);
    return record;
  }

  private createWalletRecord(input: {
    userId: number;
    chainId: number;
    chainLabel: string;
    address: string;
    isPrimary?: boolean;
  }) {
    const record: WalletRecord = {
      id: this.walletSeq++,
      userId: input.userId,
      chainId: input.chainId,
      chainLabel: input.chainLabel,
      address: input.address.toLowerCase(),
      isPrimary: input.isPrimary ?? false,
      createdAt: this.now()
    };
    if (record.isPrimary) {
      this.wallets.forEach((wallet) => {
        if (wallet.userId === record.userId) wallet.isPrimary = false;
      });
    }
    this.wallets.push(record);
    return record;
  }

  private createConversationRecord(input: {
    kind: "dm" | "group";
    title: string;
    ownerId?: number | null;
    inviteCode?: string | null;
  }) {
    const record: ConversationRecord = {
      id: this.conversationSeq++,
      kind: input.kind,
      title: input.title,
      inviteCode: input.inviteCode ?? null,
      ownerId: input.ownerId ?? null,
      createdAt: this.now()
    };
    this.conversations.push(record);
    return record;
  }

  private addConversationMember(input: {
    conversationId: number;
    userId: number;
    role?: "owner" | "member";
  }) {
    const record: ConversationMemberRecord = {
      id: this.conversationMemberSeq++,
      conversationId: input.conversationId,
      userId: input.userId,
      role: input.role ?? "member",
      lastReadMessageId: null,
      mutedUntil: null,
      joinedAt: this.now()
    };
    this.conversationMembers.push(record);
    return record;
  }

  private createMessage(input: {
    conversationId: number;
    senderId: number;
    content: string;
    mentionUserIds?: number[];
  }) {
    const record: MessageRecord = {
      id: this.messageSeq++,
      conversationId: input.conversationId,
      senderId: input.senderId,
      content: input.content,
      mentionUserIds: input.mentionUserIds ?? [],
      createdAt: this.now()
    };
    this.messages.push(record);
    return record;
  }

  private addFriendship(userA: number, userB: number) {
    this.friendships.add(this.friendshipKey(userA, userB));
  }

  private seedSystemData() {
    const concierge = this.createUserRecord({
      nickname: "Circuit Concierge",
      bio: "入门引导、安全提示与欢迎消息"
    });
    const guide = this.createUserRecord({
      nickname: "Atlas Research",
      bio: "社区情报与群组运营协作"
    });

    this.createWalletRecord({
      userId: concierge.id,
      chainId: PRIMARY_CHAIN_ID,
      chainLabel: PRIMARY_CHAIN_LABEL,
      address: "0x000000000000000000000000000000000000c0de",
      isPrimary: true
    });
    this.createWalletRecord({
      userId: guide.id,
      chainId: PRIMARY_CHAIN_ID,
      chainLabel: PRIMARY_CHAIN_LABEL,
      address: "0x000000000000000000000000000000000000beef",
      isPrimary: true
    });

    const lounge = this.createConversationRecord({
      kind: "group",
      title: "Circuit Lounge",
      ownerId: concierge.id,
      inviteCode: "C8X6J2QH"
    });
    this.addConversationMember({
      conversationId: lounge.id,
      userId: concierge.id,
      role: "owner"
    });
    this.addConversationMember({
      conversationId: lounge.id,
      userId: guide.id
    });
    this.createMessage({
      conversationId: lounge.id,
      senderId: concierge.id,
      content: "欢迎来到 Circuit Lounge。先用测试钱包完成签名，再开始社交。"
    });
    this.createMessage({
      conversationId: lounge.id,
      senderId: guide.id,
      content: "这里会同步公告、用户反馈和产品更新。"
    });

    this.addFriendship(concierge.id, guide.id);

    const heroUpload: UploadRecord = {
      id: this.uploadSeq++,
      userId: guide.id,
      url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=900&q=80",
      fileName: "network.jpg",
      mimeType: "image/jpeg",
      size: 320_000,
      createdAt: this.now()
    };
    this.uploads.push(heroUpload);

    this.moments.push({
      id: this.momentSeq++,
      authorId: guide.id,
      content: "我们把链上身份、社交关系和社区会话放在了同一个入口。",
      uploadIds: [heroUpload.id],
      createdAt: this.now()
    });
    this.moments.push({
      id: this.momentSeq++,
      authorId: concierge.id,
      content: "签名前请确认域名、用途和链信息，推荐使用测试钱包体验。",
      uploadIds: [],
      createdAt: this.now()
    });

    this.taskDefinitions.push(
      {
        key: "first_moment",
        titleZh: "发布第一条动态",
        titleEn: "Publish your first moment",
        descriptionZh: "完成一次朋友圈发布。",
        descriptionEn: "Create a moment post once.",
        target: 1,
        points: 10,
        enabled: true
      },
      {
        key: "first_like",
        titleZh: "完成第一次点赞",
        titleEn: "Give your first like",
        descriptionZh: "对任意动态点一次赞。",
        descriptionEn: "Like any moment once.",
        target: 1,
        points: 2,
        enabled: true
      },
      {
        key: "first_comment",
        titleZh: "完成第一次评论",
        titleEn: "Write your first comment",
        descriptionZh: "对任意动态发一条评论。",
        descriptionEn: "Comment on any moment once.",
        target: 1,
        points: 4,
        enabled: true
      },
      {
        key: "complete_profile",
        titleZh: "完善个人资料",
        titleEn: "Complete your profile",
        descriptionZh: "设置头像，并填写昵称与简介。",
        descriptionEn: "Set an avatar and fill nickname & bio.",
        target: 1,
        points: 8,
        enabled: true
      },
      {
        key: "join_group",
        titleZh: "加入一个群聊",
        titleEn: "Join a group",
        descriptionZh: "加入任意群聊会话。",
        descriptionEn: "Join any group conversation.",
        target: 1,
        points: 6,
        enabled: true
      }
    );
  }

  private taskProgressKey(userId: number, taskKey: string) {
    return `${userId}:${taskKey}`;
  }

  private getOrCreateTaskProgress(userId: number, taskKey: string) {
    const key = this.taskProgressKey(userId, taskKey);
    const existing = this.taskProgress.get(key);
    if (existing) return existing;
    const created = { userId, taskKey, progress: 0, completedAt: null as string | null, updatedAt: this.now() };
    this.taskProgress.set(key, created);
    return created;
  }

  listTasks(userId: number) {
    const tasks = this.taskDefinitions
      .filter((t) => t.enabled)
      .map((def) => {
        const prog = this.getOrCreateTaskProgress(userId, def.key);
        const completed = Boolean(prog.completedAt) || prog.progress >= def.target;
        const canClaim = completed && !this.pointLedger.some(
          (row) => row.userId === userId && row.reason === "task.reward" && row.refType === "task" && row.refId === def.key
        );
        return {
          key: def.key,
          titleZh: def.titleZh,
          titleEn: def.titleEn,
          descriptionZh: def.descriptionZh,
          descriptionEn: def.descriptionEn,
          target: def.target,
          points: def.points,
          progress: Math.min(prog.progress, def.target),
          completedAt: prog.completedAt,
          canClaim
        };
      });
    return { tasks };
  }

  claimTask(userId: number, taskKey: string) {
    const def = this.taskDefinitions.find((t) => t.key === taskKey && t.enabled);
    if (!def) throw new Error("任务不存在");
    const prog = this.getOrCreateTaskProgress(userId, taskKey);
    const completed = Boolean(prog.completedAt) || prog.progress >= def.target;
    if (!completed) throw new Error("任务未完成");
    const already = this.pointLedger.some(
      (row) => row.userId === userId && row.reason === "task.reward" && row.refType === "task" && row.refId === taskKey
    );
    if (already) return { ok: true, claimed: false };
    this.pointLedger.push({
      userId,
      delta: def.points,
      reason: "task.reward",
      refType: "task",
      refId: taskKey,
      createdAt: this.now()
    });
    return { ok: true, claimed: true, delta: def.points };
  }

  getPoints(userId: number) {
    const rows = this.pointLedger.filter((r) => r.userId === userId).slice().reverse().slice(0, 30);
    const total = this.pointLedger.filter((r) => r.userId === userId).reduce((sum, r) => sum + r.delta, 0);
    return { total, ledger: rows };
  }

  bumpTaskProgress(userId: number, taskKey: string, amount: number) {
    const def = this.taskDefinitions.find((t) => t.key === taskKey && t.enabled);
    if (!def) return;
    const prog = this.getOrCreateTaskProgress(userId, taskKey);
    if (prog.completedAt) return;
    prog.progress += amount;
    prog.updatedAt = this.now();
    if (prog.progress >= def.target) {
      prog.completedAt = this.now();
    }
  }

  awardPointsOnce(input: { userId: number; delta: number; reason: string; refType: string; refId: string }) {
    const exists = this.pointLedger.some(
      (row) =>
        row.userId === input.userId &&
        row.reason === input.reason &&
        row.refType === input.refType &&
        row.refId === input.refId
    );
    if (exists) return { ok: true, awarded: false };
    this.pointLedger.push({ ...input, createdAt: this.now() });
    return { ok: true, awarded: true };
  }

  logAudit(input: Omit<AuditLogRecord, "id" | "createdAt">) {
    this.auditLogs.push({
      id: this.auditSeq++,
      createdAt: this.now(),
      ...input
    });
  }

  createTenantApp(input: {
    ownerUserId: number;
    name: string;
    chainPolicy: Array<"evm" | "solana">;
    callbackUrl: string | null;
  }) {
    const now = this.now();
    const app: TenantAppRecord = {
      id: this.tenantAppSeq++,
      ownerUserId: input.ownerUserId,
      name: input.name,
      chainPolicy: input.chainPolicy,
      callbackUrl: input.callbackUrl,
      createdAt: now,
      updatedAt: now
    };
    this.tenantApps.push(app);
    this.tenantKeys.push({
      id: this.tenantKeySeq++,
      appId: app.id,
      keyId: `tk_${randomBytes(8).toString("hex")}`,
      status: "active",
      lastRotatedAt: null,
      rotatedByUserId: null,
      createdAt: now
    });
    this.tenantBrandings.push({
      appId: app.id,
      logoUrl: null,
      themeColor: "#22c55e",
      displayName: null,
      updatedAt: now
    });
    return app;
  }

  listTenantAppsByOwner(ownerUserId: number) {
    return this.tenantApps.filter((item) => item.ownerUserId === ownerUserId);
  }

  getTenantAppById(appId: number) {
    return this.tenantApps.find((item) => item.id === appId) ?? null;
  }

  listTenantDomains(appId: number) {
    return this.tenantDomains.filter((item) => item.appId === appId);
  }

  listTenantKeys(appId: number) {
    return this.tenantKeys.filter((item) => item.appId === appId);
  }

  rotateTenantKey(appId: number, rotatedByUserId: number) {
    const now = this.now();
    this.tenantKeys
      .filter((item) => item.appId === appId && item.status === "active")
      .forEach((item) => {
        item.status = "rotated";
        item.lastRotatedAt = now;
        item.rotatedByUserId = rotatedByUserId;
      });
    const created: TenantKeyRecord = {
      id: this.tenantKeySeq++,
      appId,
      keyId: `tk_${randomBytes(8).toString("hex")}`,
      status: "active",
      lastRotatedAt: null,
      rotatedByUserId: rotatedByUserId,
      createdAt: now
    };
    this.tenantKeys.push(created);
    const app = this.getTenantAppById(appId);
    if (app) app.updatedAt = now;
    return created;
  }

  getTenantBranding(appId: number) {
    return this.tenantBrandings.find((item) => item.appId === appId) ?? null;
  }

  upsertTenantBranding(
    appId: number,
    input: {
      logoUrl?: string | null;
      themeColor?: string | null;
      displayName?: string | null;
    }
  ) {
    const now = this.now();
    const existing = this.getTenantBranding(appId);
    if (existing) {
      if (input.logoUrl !== undefined) existing.logoUrl = input.logoUrl;
      if (input.themeColor !== undefined) existing.themeColor = input.themeColor;
      if (input.displayName !== undefined) existing.displayName = input.displayName;
      existing.updatedAt = now;
    } else {
      this.tenantBrandings.push({
        appId,
        logoUrl: input.logoUrl ?? null,
        themeColor: input.themeColor ?? null,
        displayName: input.displayName ?? null,
        updatedAt: now
      });
    }
    const app = this.getTenantAppById(appId);
    if (app) app.updatedAt = now;
    return this.getTenantBranding(appId)!;
  }

  addTenantDomain(appId: number, domain: string) {
    const exists = this.tenantDomains.some((item) => item.appId === appId && item.domain === domain);
    if (exists) {
      throw new Error("域名已存在");
    }
    const record: TenantDomainRecord = {
      id: this.tenantDomainSeq++,
      appId,
      domain,
      createdAt: this.now()
    };
    this.tenantDomains.push(record);
    const app = this.getTenantAppById(appId);
    if (app) {
      app.updatedAt = this.now();
    }
    return record;
  }

  updateTenantApp(
    appId: number,
    input: {
      name?: string;
      chainPolicy?: Array<"evm" | "solana">;
      callbackUrl?: string | null;
    }
  ) {
    const app = this.getTenantAppById(appId);
    if (!app) {
      throw new Error("应用不存在");
    }
    if (input.name !== undefined) app.name = input.name;
    if (input.chainPolicy !== undefined) app.chainPolicy = input.chainPolicy;
    if (input.callbackUrl !== undefined) app.callbackUrl = input.callbackUrl;
    app.updatedAt = this.now();
    return app;
  }

  getUserById(userId: number) {
    return this.users.find((user) => user.id === userId) ?? null;
  }

  getUserByNickname(nickname: string) {
    return this.users.find((user) => user.nickname === nickname) ?? null;
  }

  getWalletById(walletId: number) {
    return this.wallets.find((wallet) => wallet.id === walletId) ?? null;
  }

  getWalletByAddress(chainId: number, address: string) {
    return (
      this.wallets.find(
        (wallet) =>
          wallet.chainId === chainId && wallet.address === address.toLowerCase()
      ) ?? null
    );
  }

  getPrimaryWallet(userId: number) {
    return (
      this.wallets.find((wallet) => wallet.userId === userId && wallet.isPrimary) ??
      this.wallets.find((wallet) => wallet.userId === userId) ??
      null
    );
  }

  getUserWallets(userId: number) {
    return this.wallets.filter((wallet) => wallet.userId === userId);
  }

  ensureTestPresetUser(preset: TestSessionPreset) {
    const address = TEST_WALLET_PRESETS[preset];
    if (preset === "fresh-user") {
      return this.upsertUserForWallet({
        chainId: PRIMARY_CHAIN_ID,
        chainLabel: PRIMARY_CHAIN_LABEL,
        address
      });
    }
    const wallet = this.getWalletByAddress(PRIMARY_CHAIN_ID, address);
    if (!wallet) {
      throw new Error(`测试账号 ${preset} 不存在`);
    }
    const user = this.getUserById(wallet.userId);
    if (!user) {
      throw new Error(`测试账号 ${preset} 用户不存在`);
    }
    return user;
  }

  toPublicUser(userId: number): PublicUser {
    const user = this.getUserById(userId);
    const wallet = this.getPrimaryWallet(userId);
    if (!user || !wallet) {
      throw new Error("用户不存在");
    }
    return {
      id: user.id,
      nickname: user.nickname,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      didUri: user.didUri,
      encryptionPublicKey: user.encryptionPublicKey,
      primaryWalletAddress: wallet.address,
      primaryChainId: wallet.chainId,
      primaryChainLabel: wallet.chainLabel
    };
  }

  createNonce(input: {
    address: string;
    chainId: number;
    intent: "login" | "bind";
  }) {
    const nonce = randomBytes(16).toString("hex");
    const record: NonceRecord = {
      nonce,
      address: input.address.toLowerCase(),
      chainId: input.chainId,
      intent: input.intent,
      issuedAt: this.now(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    };
    this.nonces.set(nonce, record);
    return record;
  }

  consumeNonce(nonce: string) {
    const record = this.nonces.get(nonce) ?? null;
    if (record) {
      this.nonces.delete(nonce);
    }
    return record;
  }

  createSession(userId: number) {
    const session: SessionRecord = {
      id: randomUUID(),
      userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: this.now()
    };
    this.sessions.set(session.id, session);
    return session;
  }

  getSession(sessionId: string) {
    const record = this.sessions.get(sessionId) ?? null;
    if (!record) return null;
    if (new Date(record.expiresAt).getTime() < Date.now()) {
      this.sessions.delete(sessionId);
      return null;
    }
    return record;
  }

  removeSession(sessionId: string) {
    this.sessions.delete(sessionId);
  }

  upsertUserForWallet(input: {
    chainId: number;
    chainLabel: string;
    address: string;
  }) {
    const wallet = this.getWalletByAddress(input.chainId, input.address);
    if (wallet) {
      return this.getUserById(wallet.userId)!;
    }

    const raw = input.address.trim();
    const defaultNickname = /^0x[0-9a-fA-F]+$/i.test(raw)
      ? raw.slice(2).toLowerCase().slice(-6)
      : raw.length >= 6
        ? raw.slice(-6)
        : raw;
    const user = this.createUserRecord({
      nickname: defaultNickname,
      bio: "新加入 Circuit 的链上成员"
    });
    this.createWalletRecord({
      userId: user.id,
      chainId: input.chainId,
      chainLabel: input.chainLabel,
      address: input.address,
      isPrimary: true
    });
    this.bootstrapNewUser(user.id);
    this.logAudit({
      actorId: user.id,
      action: "user.created",
      targetType: "user",
      targetId: String(user.id),
      detail: "通过 SIWE 首次注册"
    });
    return user;
  }

  bindWalletToUser(input: {
    userId: number;
    chainId: number;
    chainLabel: string;
    address: string;
  }) {
    const existing = this.getWalletByAddress(input.chainId, input.address);
    if (existing && existing.userId !== input.userId) {
      throw new Error("该钱包已绑定其他账户");
    }
    if (existing) return existing;
    const wallet = this.createWalletRecord({
      userId: input.userId,
      chainId: input.chainId,
      chainLabel: input.chainLabel,
      address: input.address,
      isPrimary: false
    });
    this.logAudit({
      actorId: input.userId,
      action: "wallet.bound",
      targetType: "wallet",
      targetId: String(wallet.id),
      detail: wallet.address
    });
    return wallet;
  }

  removeWallet(userId: number, walletId: number) {
    const wallet = this.getWalletById(walletId);
    if (!wallet || wallet.userId !== userId) {
      throw new Error("钱包不存在");
    }
    const ownWallets = this.getUserWallets(userId);
    if (ownWallets.length <= 1) {
      throw new Error("至少保留一个钱包");
    }
    const nextWallet = ownWallets.find((item) => item.id !== walletId) ?? null;
    const index = this.wallets.findIndex((item) => item.id === walletId);
    this.wallets.splice(index, 1);
    if (wallet.isPrimary && nextWallet) {
      nextWallet.isPrimary = true;
    }
    this.logAudit({
      actorId: userId,
      action: "wallet.removed",
      targetType: "wallet",
      targetId: String(walletId),
      detail: wallet.address
    });
  }

  setPrimaryWallet(userId: number, walletId: number) {
    const wallet = this.getWalletById(walletId);
    if (!wallet || wallet.userId !== userId) {
      throw new Error("钱包不存在");
    }
    this.wallets.forEach((item) => {
      if (item.userId === userId) item.isPrimary = item.id === walletId;
    });
  }

  updateProfile(input: {
    userId: number;
    nickname?: string;
    bio?: string;
    avatarUrl?: string | null;
    didUri?: string | null;
    encryptionPublicKey?: string | null;
  }) {
    const user = this.getUserById(input.userId);
    if (!user) {
      throw new Error("用户不存在");
    }
    if (input.nickname !== undefined) user.nickname = input.nickname;
    if (input.bio !== undefined) user.bio = input.bio;
    if (input.avatarUrl !== undefined) user.avatarUrl = input.avatarUrl;
    if (input.didUri !== undefined) user.didUri = input.didUri;
    if (input.encryptionPublicKey !== undefined) {
      user.encryptionPublicKey = input.encryptionPublicKey;
    }
    return user;
  }

  private bootstrapNewUser(userId: number) {
    const lounge = this.conversations.find((item) => item.inviteCode === "C8X6J2QH");
    const concierge = this.users.find((user) => user.nickname === "Circuit Concierge");
    if (lounge) {
      this.addConversationMember({
        conversationId: lounge.id,
        userId
      });
      const membership = this.conversationMembers.find(
        (member) => member.conversationId === lounge.id && member.userId === userId
      );
      if (membership) membership.lastReadMessageId = this.latestMessageId(lounge.id);
    }
    if (concierge) {
      this.addFriendship(userId, concierge.id);
      const dm = this.ensureDirectConversation(userId, concierge.id);
      this.createMessage({
        conversationId: dm.id,
        senderId: concierge.id,
        content: "欢迎加入 Circuit。先完善资料，再去通讯录建立第一条关系。"
      });
      const membership = this.conversationMembers.find(
        (member) => member.conversationId === dm.id && member.userId === userId
      );
      if (membership) membership.lastReadMessageId = null;
    }
  }

  getFriends(userId: number) {
    const friends: PublicUser[] = [];
    for (const key of this.friendships) {
      const [a, b] = key.split(":").map(Number);
      if (a === userId) friends.push(this.toPublicUser(b));
      if (b === userId) friends.push(this.toPublicUser(a));
    }
    return friends;
  }

  areFriends(a: number, b: number) {
    return this.friendships.has(this.friendshipKey(a, b));
  }

  createFriendRequest(fromUserId: number, target: { userId?: number; address?: string }) {
    let toUserId = target.userId ?? null;
    const targetAddress = target.address?.toLowerCase();
    if (!toUserId && targetAddress) {
      const wallet = this.wallets.find((item) => item.address === targetAddress);
      toUserId = wallet?.userId ?? null;
    }
    if (!toUserId) {
      throw new Error("目标用户不存在");
    }
    if (toUserId === fromUserId) {
      throw new Error("不能添加自己");
    }
    if (this.areFriends(fromUserId, toUserId)) {
      throw new Error("你们已经是好友");
    }
    const existing = this.friendRequests.find(
      (request) =>
        request.status === "pending" &&
        ((request.fromUserId === fromUserId && request.toUserId === toUserId) ||
          (request.fromUserId === toUserId && request.toUserId === fromUserId))
    );
    if (existing) {
      throw new Error("好友申请已存在");
    }
    const record: FriendRequestRecord = {
      id: this.requestSeq++,
      fromUserId,
      toUserId,
      status: "pending",
      createdAt: this.now(),
      updatedAt: this.now()
    };
    this.friendRequests.push(record);
    this.logAudit({
      actorId: fromUserId,
      action: "friend-request.created",
      targetType: "friend_request",
      targetId: String(record.id),
      detail: `to:${toUserId}`
    });
    return record;
  }

  getFriendRequests(userId: number) {
    const incoming = this.friendRequests
      .filter((item) => item.toUserId === userId && item.status === "pending")
      .map((item) => this.toFriendRequestView(item));
    const outgoing = this.friendRequests
      .filter((item) => item.fromUserId === userId && item.status === "pending")
      .map((item) => this.toFriendRequestView(item));
    return { incoming, outgoing };
  }

  respondFriendRequest(userId: number, requestId: number, action: "accept" | "decline") {
    const request = this.friendRequests.find((item) => item.id === requestId) ?? null;
    if (!request || request.toUserId !== userId || request.status !== "pending") {
      throw new Error("好友申请不存在");
    }
    request.status = action === "accept" ? "accepted" : "declined";
    request.updatedAt = this.now();
    if (action === "accept") {
      this.addFriendship(request.fromUserId, request.toUserId);
      this.ensureDirectConversation(request.fromUserId, request.toUserId);
    }
    this.logAudit({
      actorId: userId,
      action: `friend-request.${action}`,
      targetType: "friend_request",
      targetId: String(requestId),
      detail: null
    });
    return request;
  }

  private toFriendRequestView(record: FriendRequestRecord): FriendRequestView {
    return {
      ...record,
      from: this.toPublicUser(record.fromUserId),
      to: this.toPublicUser(record.toUserId)
    };
  }

  ensureDirectConversation(userA: number, userB: number) {
    const existing = this.conversations.find((conversation) => {
      if (conversation.kind !== "dm") return false;
      const members = this.conversationMembers
        .filter((member) => member.conversationId === conversation.id)
        .map((member) => member.userId);
      return members.includes(userA) && members.includes(userB) && members.length === 2;
    });
    if (existing) return existing;
    const conversation = this.createConversationRecord({
      kind: "dm",
      title: `${this.toPublicUser(userA).nickname} × ${this.toPublicUser(userB).nickname}`
    });
    this.addConversationMember({ conversationId: conversation.id, userId: userA });
    this.addConversationMember({ conversationId: conversation.id, userId: userB });
    return conversation;
  }

  createGroup(ownerId: number, title: string) {
    const conversation = this.createConversationRecord({
      kind: "group",
      title,
      ownerId,
      inviteCode: this.generateUniqueInviteCode()
    });
    this.addConversationMember({
      conversationId: conversation.id,
      userId: ownerId,
      role: "owner"
    });
    return conversation;
  }

  private generateUniqueInviteCode() {
    let code = this.generateInviteCode();
    while (this.conversations.some((item) => item.inviteCode === code)) {
      code = this.generateInviteCode();
    }
    return code;
  }

  joinGroup(userId: number, inviteCode: string) {
    const conversation =
      this.conversations.find(
        (item) => item.kind === "group" && item.inviteCode === inviteCode.toUpperCase()
      ) ?? null;
    if (!conversation) {
      throw new Error("群邀请码无效");
    }
    const membership = this.getConversationMember(conversation.id, userId);
    if (!membership) {
      this.addConversationMember({
        conversationId: conversation.id,
        userId
      });
    }
    return conversation;
  }

  getConversationById(conversationId: number) {
    return this.conversations.find((item) => item.id === conversationId) ?? null;
  }

  getConversationMember(conversationId: number, userId: number) {
    return (
      this.conversationMembers.find(
        (member) =>
          member.conversationId === conversationId && member.userId === userId
      ) ?? null
    );
  }

  getConversationMembers(conversationId: number) {
    return this.conversationMembers.filter(
      (member) => member.conversationId === conversationId
    );
  }

  getConversationParticipants(conversationId: number) {
    return this.getConversationMembers(conversationId).map((member) =>
      this.toPublicUser(member.userId)
    );
  }

  listConversationSummaries(userId: number): ConversationSummary[] {
    return this.conversationMembers
      .filter((member) => member.userId === userId)
      .map((member) => {
        const conversation = this.getConversationById(member.conversationId)!;
        const messages = this.messages
          .filter((item) => item.conversationId === member.conversationId)
          .sort((left, right) => left.id - right.id);
        const lastMessage = messages[messages.length - 1] ?? null;
        const unreadCount = messages.filter(
          (item) => (member.lastReadMessageId ?? 0) < item.id && item.senderId !== userId
        ).length;
        const participants = this.getConversationParticipants(conversation.id);
        const title =
          conversation.kind === "dm"
            ? participants.find((person) => person.id !== userId)?.nickname ?? conversation.title
            : conversation.title;
        return {
          id: conversation.id,
          kind: conversation.kind,
          title,
          inviteCode: conversation.inviteCode,
          ownerId: conversation.ownerId,
          unreadCount,
          memberCount: participants.length,
          lastMessage: lastMessage
            ? {
                id: lastMessage.id,
                content: lastMessage.content,
                createdAt: lastMessage.createdAt,
                senderNickname: this.toPublicUser(lastMessage.senderId).nickname
              }
            : null
        };
      })
      .sort((left, right) => {
        const leftStamp = left.lastMessage?.id ?? 0;
        const rightStamp = right.lastMessage?.id ?? 0;
        return rightStamp - leftStamp;
      });
  }

  listMessages(userId: number, input: {
    conversationId: number;
    afterId?: number;
    beforeId?: number;
  }) {
    const membership = this.getConversationMember(input.conversationId, userId);
    if (!membership) throw new Error("无权限访问该会话");
    let items = this.messages
      .filter((message) => message.conversationId === input.conversationId)
      .sort((left, right) => left.id - right.id);
    if (input.afterId) {
      items = items.filter((message) => message.id > input.afterId!);
    }
    if (input.beforeId) {
      items = items.filter((message) => message.id < input.beforeId!).slice(-40);
    } else if (!input.afterId) {
      items = items.slice(-40);
    }
    return items.map((message) => this.toMessageView(userId, message));
  }

  toMessageView(viewerId: number, message: MessageRecord): MessageView {
    return {
      id: message.id,
      conversationId: message.conversationId,
      content: message.content,
      createdAt: message.createdAt,
      sender: this.toPublicUser(message.senderId),
      mentionUserIds: message.mentionUserIds,
      mine: viewerId === message.senderId
    };
  }

  sendMessage(userId: number, input: {
    conversationId: number;
    content: string;
    mentionUserIds?: number[];
  }) {
    const membership = this.getConversationMember(input.conversationId, userId);
    if (!membership) throw new Error("无权限发送消息");
    if (
      membership.mutedUntil &&
      new Date(membership.mutedUntil).getTime() > Date.now()
    ) {
      throw new Error("你已被禁言");
    }
    const message = this.createMessage({
      conversationId: input.conversationId,
      senderId: userId,
      content: input.content.trim(),
      mentionUserIds: (input.mentionUserIds ?? []).filter((id) =>
        this.getConversationMember(input.conversationId, id)
      )
    });
    membership.lastReadMessageId = message.id;
    this.logAudit({
      actorId: userId,
      action: "message.sent",
      targetType: "conversation",
      targetId: String(input.conversationId),
      detail: String(message.id)
    });
    return message;
  }

  markRead(userId: number, conversationId: number, messageId: number | null) {
    const membership = this.getConversationMember(conversationId, userId);
    if (!membership) throw new Error("无权限");
    membership.lastReadMessageId = messageId;
  }

  latestMessageId(conversationId: number) {
    return this.messages
      .filter((message) => message.conversationId === conversationId)
      .at(-1)?.id ?? null;
  }

  kickGroupMember(actorId: number, groupId: number, targetUserId: number) {
    const conversation = this.getConversationById(groupId);
    const actor = this.getConversationMember(groupId, actorId);
    if (!conversation || conversation.kind !== "group") {
      throw new Error("群不存在");
    }
    if (!actor || actor.role !== "owner") {
      throw new Error("只有群主可移除成员");
    }
    if (conversation.ownerId === targetUserId) {
      throw new Error("不能移除群主");
    }
    const index = this.conversationMembers.findIndex(
      (member) =>
        member.conversationId === groupId && member.userId === targetUserId
    );
    if (index < 0) throw new Error("成员不存在");
    this.conversationMembers.splice(index, 1);
  }

  muteGroupMember(actorId: number, groupId: number, targetUserId: number, minutes: number) {
    const actor = this.getConversationMember(groupId, actorId);
    const member = this.getConversationMember(groupId, targetUserId);
    if (!actor || actor.role !== "owner") {
      throw new Error("只有群主可禁言");
    }
    if (!member) throw new Error("成员不存在");
    member.mutedUntil =
      minutes <= 0
        ? null
        : new Date(Date.now() + minutes * 60 * 1000).toISOString();
    return member;
  }

  leaveGroup(userId: number, groupId: number) {
    const conversation = this.getConversationById(groupId);
    if (!conversation || conversation.kind !== "group") {
      throw new Error("群不存在");
    }
    const index = this.conversationMembers.findIndex(
      (member) => member.conversationId === groupId && member.userId === userId
    );
    if (index < 0) throw new Error("你不在该群中");
    const isOwner = conversation.ownerId === userId;
    if (isOwner) {
      const others = this.getConversationMembers(groupId).filter(
        (member) => member.userId !== userId
      );
      if (others.length === 0) {
        this.conversationMembers.splice(index, 1);
        const convIndex = this.conversations.findIndex((item) => item.id === groupId);
        this.conversations.splice(convIndex, 1);
        return { dissolved: true };
      }
      conversation.ownerId = others[0].userId;
      others[0].role = "owner";
    }
    this.conversationMembers.splice(index, 1);
    return { dissolved: false };
  }

  createUpload(input: {
    userId: number;
    url: string;
    fileName: string;
    mimeType: string;
    size: number;
  }) {
    const upload: UploadRecord = {
      id: this.uploadSeq++,
      userId: input.userId,
      url: input.url,
      fileName: input.fileName,
      mimeType: input.mimeType,
      size: input.size,
      createdAt: this.now()
    };
    this.uploads.push(upload);
    return upload;
  }

  getUpload(uploadId: number) {
    return this.uploads.find((upload) => upload.id === uploadId) ?? null;
  }

  createMoment(userId: number, input: { content: string; uploadIds: number[] }) {
    const uploads = input.uploadIds.map((uploadId) => this.getUpload(uploadId));
    if (uploads.some((upload) => !upload || upload.userId !== userId)) {
      throw new Error("图片资源无效");
    }
    const moment: MomentRecord = {
      id: this.momentSeq++,
      authorId: userId,
      content: input.content.trim(),
      uploadIds: input.uploadIds,
      createdAt: this.now()
    };
    this.moments.unshift(moment);
    return moment;
  }

  private isCommentAdmin(_userId: number) {
    // Placeholder for future admin source (env/config/role service).
    return false;
  }

  private getMomentById(momentId: number) {
    return this.moments.find((moment) => moment.id === momentId) ?? null;
  }

  private getMomentCommentById(commentId: number) {
    return this.momentComments.find((comment) => comment.id === commentId) ?? null;
  }

  discoverHot(userId: number) {
    const windowHours = 72;
    const sinceMs = Date.now() - windowHours * 60 * 60 * 1000;
    const isInWindow = (iso: string) => new Date(iso).getTime() >= sinceMs;

    const momentIdsInWindow = new Set(this.moments.filter((m) => isInWindow(m.createdAt)).map((m) => m.id));
    const likeCountByMoment = new Map<number, number>();
    for (const like of this.momentLikes) {
      if (!momentIdsInWindow.has(like.momentId)) continue;
      likeCountByMoment.set(like.momentId, (likeCountByMoment.get(like.momentId) ?? 0) + 1);
    }
    const commentCountByMoment = new Map<number, number>();
    for (const c of this.momentComments) {
      if (!momentIdsInWindow.has(c.momentId)) continue;
      commentCountByMoment.set(c.momentId, (commentCountByMoment.get(c.momentId) ?? 0) + 1);
    }
    const hotMoments = this.moments
      .filter((m) => momentIdsInWindow.has(m.id))
      .map((m) => {
        const likes = likeCountByMoment.get(m.id) ?? 0;
        const comments = commentCountByMoment.get(m.id) ?? 0;
        const score = likes * 3 + comments * 2;
        return {
          id: m.id,
          score,
          reason: `likes=${likes}, comments=${comments}, window=${windowHours}h`,
          moment: this.toMomentView(userId, m)
        };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.id - b.id;
      })
      .slice(0, 10);

    const groupIds = this.conversations.filter((c) => c.kind === "group").map((c) => c.id);
    const msgCountByConv = new Map<number, number>();
    const sendersByConv = new Map<number, Set<number>>();
    for (const msg of this.messages) {
      if (!groupIds.includes(msg.conversationId)) continue;
      if (!isInWindow(msg.createdAt)) continue;
      msgCountByConv.set(msg.conversationId, (msgCountByConv.get(msg.conversationId) ?? 0) + 1);
      const set = sendersByConv.get(msg.conversationId) ?? new Set<number>();
      set.add(msg.senderId);
      sendersByConv.set(msg.conversationId, set);
    }
    const hotGroups = this.conversations
      .filter((c) => c.kind === "group")
      .map((c) => {
        const messages = msgCountByConv.get(c.id) ?? 0;
        const activeSenders = sendersByConv.get(c.id)?.size ?? 0;
        const score = messages + activeSenders * 2;
        return { id: c.id, score, reason: `messages=${messages}, activeSenders=${activeSenders}, window=${windowHours}h`, group: c };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.id - b.id;
      })
      .slice(0, 10);

    const interaction = new Map<number, { likes: number; comments: number; messages: number }>();
    for (const like of this.momentLikes) {
      if (!isInWindow(like.createdAt)) continue;
      const prev = interaction.get(like.userId) ?? { likes: 0, comments: 0, messages: 0 };
      interaction.set(like.userId, { ...prev, likes: prev.likes + 1 });
    }
    for (const c of this.momentComments) {
      if (!isInWindow(c.createdAt)) continue;
      const prev = interaction.get(c.authorId) ?? { likes: 0, comments: 0, messages: 0 };
      interaction.set(c.authorId, { ...prev, comments: prev.comments + 1 });
    }
    for (const msg of this.messages) {
      if (!isInWindow(msg.createdAt)) continue;
      const prev = interaction.get(msg.senderId) ?? { likes: 0, comments: 0, messages: 0 };
      interaction.set(msg.senderId, { ...prev, messages: prev.messages + 1 });
    }
    const recommendedUsers = Array.from(interaction.entries())
      .map(([id, parts]) => {
        const score = parts.likes + parts.comments * 2 + parts.messages;
        return {
          id,
          score,
          reason: `likesGiven=${parts.likes}, commentsWritten=${parts.comments}, messagesSent=${parts.messages}, window=${windowHours}h`,
          user: this.toPublicUser(id)
        };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.id - b.id;
      })
      .slice(0, 10);

    return {
      ok: true,
      windowHours,
      hotMoments,
      hotGroups,
      recommendedUsers
    };
  }

  toggleMomentLike(userId: number, momentId: number) {
    const moment = this.getMomentById(momentId);
    if (!moment) throw new Error("动态不存在");
    const existingIndex = this.momentLikes.findIndex((like) => like.momentId === momentId && like.userId === userId);
    if (existingIndex >= 0) {
      this.momentLikes.splice(existingIndex, 1);
      return { liked: false, count: this.momentLikes.filter((like) => like.momentId === momentId).length };
    }
    this.momentLikes.push({ momentId, userId, createdAt: this.now() });
    return { liked: true, count: this.momentLikes.filter((like) => like.momentId === momentId).length };
  }

  toggleMomentCommentLike(userId: number, momentId: number, commentId: number) {
    const moment = this.getMomentById(momentId);
    if (!moment) throw new Error("动态不存在");
    const comment = this.getMomentCommentById(commentId);
    if (!comment || comment.momentId !== momentId) throw new Error("评论不存在");
    const existingIndex = this.momentCommentLikes.findIndex((like) => like.commentId === commentId && like.userId === userId);
    if (existingIndex >= 0) {
      this.momentCommentLikes.splice(existingIndex, 1);
      return { liked: false, count: this.momentCommentLikes.filter((like) => like.commentId === commentId).length };
    }
    this.momentCommentLikes.push({ commentId, userId, createdAt: this.now() });
    return { liked: true, count: this.momentCommentLikes.filter((like) => like.commentId === commentId).length };
  }

  toggleMomentCommentPin(userId: number, momentId: number, commentId: number) {
    const moment = this.getMomentById(momentId);
    if (!moment) throw new Error("动态不存在");
    if (moment.authorId !== userId) throw new Error("仅作者可置顶评论");
    const comment = this.getMomentCommentById(commentId);
    if (!comment || comment.momentId !== momentId) throw new Error("评论不存在");
    const existing = this.momentCommentPins.get(momentId);
    if (existing?.commentId === commentId) {
      this.momentCommentPins.delete(momentId);
      return { pinned: false };
    }
    this.momentCommentPins.set(momentId, { momentId, commentId, pinnedByUserId: userId, pinnedAt: this.now() });
    return { pinned: true };
  }

  createMomentComment(
    userId: number,
    input: { momentId: number; content: string; parentCommentId?: number | null }
  ) {
    const moment = this.getMomentById(input.momentId);
    if (!moment) {
      throw new Error("动态不存在");
    }
    const content = input.content.trim();
    if (!content) {
      throw new Error("评论内容不能为空");
    }
    const parentCommentId = input.parentCommentId ?? null;
    if (parentCommentId) {
      const parent = this.getMomentCommentById(parentCommentId);
      if (!parent || parent.momentId !== input.momentId) {
        throw new Error("回复目标不存在");
      }
    }
    const comment: MomentCommentRecord = {
      id: this.momentCommentSeq++,
      momentId: input.momentId,
      authorId: userId,
      content,
      parentCommentId,
      createdAt: this.now()
    };
    this.momentComments.push(comment);
    return comment;
  }

  private toMomentCommentView(userId: number, comment: MomentCommentRecord): MomentCommentView {
    const moment = this.getMomentById(comment.momentId);
    if (!moment) {
      throw new Error("动态不存在");
    }
    const canDelete =
      comment.authorId === userId || moment.authorId === userId || this.isCommentAdmin(userId);
    return {
      id: comment.id,
      momentId: comment.momentId,
      content: comment.content,
      createdAt: comment.createdAt,
      parentCommentId: comment.parentCommentId,
      author: this.toPublicUser(comment.authorId),
      mine: comment.authorId === userId,
      canDelete,
      likeCount: this.momentCommentLikes.filter((like) => like.commentId === comment.id).length,
      likedByMe: this.momentCommentLikes.some((like) => like.commentId === comment.id && like.userId === userId),
      pinned: this.momentCommentPins.get(comment.momentId)?.commentId === comment.id,
      replies: []
    };
  }

  listMomentComments(userId: number, momentId: number): MomentCommentView[] {
    const moment = this.getMomentById(momentId);
    if (!moment) {
      throw new Error("动态不存在");
    }
    const views = this.momentComments
      .filter((comment) => comment.momentId === momentId)
      .sort((left, right) => left.id - right.id)
      .map((comment) => this.toMomentCommentView(userId, comment));
    const byId = new Map<number, MomentCommentView>();
    views.forEach((view) => byId.set(view.id, view));
    const roots: MomentCommentView[] = [];
    views.forEach((view) => {
      if (!view.parentCommentId) {
        roots.push(view);
        return;
      }
      const parent = byId.get(view.parentCommentId);
      if (!parent) {
        roots.push(view);
        return;
      }
      parent.replies.push(view);
    });
    const pinnedId = this.momentCommentPins.get(momentId)?.commentId ?? null;
    const score = (comment: MomentCommentView) => comment.likeCount ?? 0;
    roots.sort((a, b) => {
      if (pinnedId && a.id === pinnedId) return -1;
      if (pinnedId && b.id === pinnedId) return 1;
      const diff = score(b) - score(a);
      if (diff !== 0) return diff;
      const ta = new Date(a.createdAt).getTime();
      const tb = new Date(b.createdAt).getTime();
      if (ta !== tb) return ta - tb;
      return a.id - b.id;
    });
    return roots;
  }

  deleteMomentComment(userId: number, momentId: number, commentId: number) {
    const moment = this.getMomentById(momentId);
    if (!moment) {
      throw new Error("动态不存在");
    }
    const comment = this.getMomentCommentById(commentId);
    if (!comment || comment.momentId !== momentId) {
      throw new Error("评论不存在");
    }
    const canDelete =
      comment.authorId === userId || moment.authorId === userId || this.isCommentAdmin(userId);
    if (!canDelete) {
      throw new Error("无权限删除评论");
    }

    const toDeleteIds = new Set<number>([commentId]);
    let added = true;
    while (added) {
      added = false;
      for (const item of this.momentComments) {
        if (item.parentCommentId && toDeleteIds.has(item.parentCommentId) && !toDeleteIds.has(item.id)) {
          toDeleteIds.add(item.id);
          added = true;
        }
      }
    }
    for (let index = this.momentComments.length - 1; index >= 0; index -= 1) {
      if (toDeleteIds.has(this.momentComments[index].id)) {
        this.momentComments.splice(index, 1);
      }
    }
  }

  listMoments(userId: number, beforeId?: number) {
    let items = this.moments;
    if (beforeId) {
      items = items.filter((moment) => moment.id < beforeId);
    }
    return items.slice(0, 20).map((moment) => this.toMomentView(userId, moment));
  }

  toMomentView(userId: number, moment: MomentRecord): MomentView {
    return {
      id: moment.id,
      content: moment.content,
      createdAt: moment.createdAt,
      author: this.toPublicUser(moment.authorId),
      images: moment.uploadIds
        .map((uploadId) => this.getUpload(uploadId))
        .filter((upload): upload is UploadRecord => Boolean(upload)),
      mine: moment.authorId === userId,
      likeCount: this.momentLikes.filter((like) => like.momentId === moment.id).length,
      commentCount: this.momentComments.filter((comment) => comment.momentId === moment.id).length,
      likedByMe: this.momentLikes.some((like) => like.momentId === moment.id && like.userId === userId)
    };
  }

  createReport(input: {
    reporterId: number;
    kind: "message" | "moment";
    targetId: number;
    reason: string;
  }) {
    const report: ReportRecord = {
      id: this.reportSeq++,
      reporterId: input.reporterId,
      kind: input.kind,
      targetId: input.targetId,
      reason: input.reason,
      createdAt: this.now()
    };
    this.reports.push(report);
    this.logAudit({
      actorId: input.reporterId,
      action: "report.created",
      targetType: input.kind,
      targetId: String(input.targetId),
      detail: input.reason
    });
    return report;
  }
}
