export type NotificationKind = "like" | "comment" | "reply" | "mention";

export type NotificationRealtimePayload = {
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
};

