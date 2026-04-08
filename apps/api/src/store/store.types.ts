export type WalletRecord = {
  id: number;
  userId: number;
  chainId: number;
  chainLabel: string;
  address: string;
  isPrimary: boolean;
  createdAt: string;
};

export type UserRecord = {
  id: number;
  nickname: string;
  bio: string;
  avatarUrl: string | null;
  didUri: string | null;
  encryptionPublicKey: string | null;
  createdAt: string;
};

export type SessionRecord = {
  id: string;
  userId: number;
  expiresAt: string;
  createdAt: string;
};

export type NonceRecord = {
  nonce: string;
  address: string;
  chainId: number;
  issuedAt: string;
  expiresAt: string;
  intent: "login" | "bind";
};

export type FriendRequestRecord = {
  id: number;
  fromUserId: number;
  toUserId: number;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
  updatedAt: string;
};

export type ConversationRecord = {
  id: number;
  kind: "dm" | "group";
  title: string;
  inviteCode: string | null;
  ownerId: number | null;
  createdAt: string;
};

export type ConversationMemberRecord = {
  id: number;
  conversationId: number;
  userId: number;
  role: "owner" | "member";
  lastReadMessageId: number | null;
  mutedUntil: string | null;
  joinedAt: string;
};

export type MessageRecord = {
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  mentionUserIds: number[];
  createdAt: string;
};

export type UploadRecord = {
  id: number;
  userId: number;
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
};

export type MomentRecord = {
  id: number;
  authorId: number;
  content: string;
  uploadIds: number[];
  createdAt: string;
};

export type ReportRecord = {
  id: number;
  reporterId: number;
  kind: "moment" | "message";
  targetId: number;
  reason: string;
  createdAt: string;
};

export type AuditLogRecord = {
  id: number;
  actorId: number | null;
  action: string;
  targetType: string;
  targetId: string;
  detail: string | null;
  createdAt: string;
};

export type TenantAppRecord = {
  id: number;
  ownerUserId: number;
  name: string;
  chainPolicy: Array<"evm" | "solana">;
  callbackUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TenantDomainRecord = {
  id: number;
  appId: number;
  domain: string;
  createdAt: string;
};

export type TenantKeyRecord = {
  id: number;
  appId: number;
  keyId: string;
  status: "active" | "rotated";
  lastRotatedAt: string | null;
  rotatedByUserId: number | null;
  createdAt: string;
};

export type TenantBrandingRecord = {
  appId: number;
  logoUrl: string | null;
  themeColor: string | null;
  displayName: string | null;
  updatedAt: string;
};

export type PublicUser = {
  id: number;
  nickname: string;
  bio: string;
  avatarUrl: string | null;
  didUri: string | null;
  encryptionPublicKey: string | null;
  primaryWalletAddress: string;
  primaryChainId: number;
  primaryChainLabel: string;
};

export type ConversationSummary = {
  id: number;
  kind: "dm" | "group";
  title: string;
  inviteCode: string | null;
  ownerId: number | null;
  unreadCount: number;
  memberCount: number;
  lastMessage: {
    id: number;
    content: string;
    createdAt: string;
    senderNickname: string;
  } | null;
};

export type MessageView = {
  id: number;
  conversationId: number;
  content: string;
  createdAt: string;
  sender: PublicUser;
  mentionUserIds: number[];
  mine: boolean;
};

export type FriendRequestView = FriendRequestRecord & {
  from: PublicUser;
  to: PublicUser;
};

export type MomentView = {
  id: number;
  content: string;
  createdAt: string;
  author: PublicUser;
  images: UploadRecord[];
  mine: boolean;
};
