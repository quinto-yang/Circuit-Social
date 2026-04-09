export type TabKey = "chats" | "contacts" | "discover" | "me";

export type NotificationKind = "like" | "comment" | "reply" | "mention";

export type NotificationItem = {
  id: number;
  kind: NotificationKind;
  createdAt: string;
  readAt: string | null;
  actor: {
    id: number;
    nickname: string;
    avatarUrl: string | null;
  };
  momentId: number | null;
  commentId: number | null;
  preview: {
    moment: string | null;
    comment: string | null;
  };
};

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
  likeCount?: number;
  commentCount?: number;
  likedByMe?: boolean;
};

export type MomentCommentView = {
  id: number;
  momentId: number;
  content: string;
  createdAt: string;
  parentCommentId: number | null;
  author: UserProfile;
  mine: boolean;
  canDelete: boolean;
  likeCount?: number;
  likedByMe?: boolean;
  pinned?: boolean;
  replies: MomentCommentView[];
};

/** Row from GET /discover/hot — group is server Conversation shape (not always full ConversationSummary). */
export type DiscoverHotGroupRow = {
  id: number;
  score: number;
  reason: string;
  group: {
    id: number;
    kind: string;
    title: string;
    inviteCode: string | null;
    ownerId: number | null;
  };
};
