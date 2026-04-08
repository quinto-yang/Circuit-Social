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
  private readonly reports: ReportRecord[] = [];
  private readonly auditLogs: AuditLogRecord[] = [];
  private readonly tenantApps: TenantAppRecord[] = [];
  private readonly tenantDomains: TenantDomainRecord[] = [];
  private readonly tenantKeys: TenantKeyRecord[] = [];
  private readonly tenantBrandings: TenantBrandingRecord[] = [];

  constructor() {
    this.seedSystemData();
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
    this.reports.length = 0;
    this.auditLogs.length = 0;
    this.tenantApps.length = 0;
    this.tenantDomains.length = 0;
    this.tenantKeys.length = 0;
    this.tenantBrandings.length = 0;

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

    const short = input.address.slice(0, 6);
    const user = this.createUserRecord({
      nickname: `Builder ${short}`,
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
      mine: moment.authorId === userId
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
