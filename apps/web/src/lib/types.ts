export type TabKey = "chats" | "contacts" | "discover" | "me";

export type UserProfile = {
  id: number;
  nickname: string;
  avatarUrl: string | null;
  bio: string;
  didUri: string | null;
  encryptionPublicKey: string | null;
  primaryWalletAddress: string;
  primaryChainId: number;
  primaryChainLabel: string;
};

export type WalletAccount = {
  id: number;
  userId: number;
  chainId: number;
  chainLabel: string;
  address: string;
  isPrimary: boolean;
  createdAt: string;
};

export type SessionUserPayload = {
  user: UserProfile;
  wallets: WalletAccount[];
  didStatus?: {
    status: "unbound" | "resolvable" | "failed";
    network?: string;
    detail: string;
  };
};

export type FriendRequest = {
  id: number;
  fromUserId: number;
  toUserId: number;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
  updatedAt: string;
  from: UserProfile;
  to: UserProfile;
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
  sender: UserProfile;
  mentionUserIds: number[];
  mine?: boolean;
};

export type GroupMember = UserProfile & {
  role: "owner" | "member";
  mutedUntil: string | null;
};

export type UploadAsset = {
  id: number;
  userId: number;
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
};

export type MomentView = {
  id: number;
  content: string;
  createdAt: string;
  author: UserProfile;
  images: UploadAsset[];
  mine: boolean;
};
