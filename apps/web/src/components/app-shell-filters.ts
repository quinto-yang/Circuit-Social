import type { ConversationSummary, MomentView, SessionUserPayload } from "@/lib/types";

export function filterConversationsByQuery(
  conversations: ConversationSummary[],
  rawQuery: string
): ConversationSummary[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return conversations;
  return conversations.filter((conversation) => {
    const title = conversation.title.toLowerCase();
    const last = conversation.lastMessage
      ? `${conversation.lastMessage.senderNickname}: ${conversation.lastMessage.content}`.toLowerCase()
      : "";
    return title.includes(query) || last.includes(query);
  });
}

export function pickGroupConversations(conversations: ConversationSummary[]): ConversationSummary[] {
  return conversations.filter((conversation) => conversation.kind === "group");
}

export function filterGroupConversationsByQuery(
  groupConversations: ConversationSummary[],
  contactQuery: string
): ConversationSummary[] {
  if (!contactQuery) return groupConversations;
  return groupConversations.filter((conversation) => {
    const inviteCode = (conversation.inviteCode ?? "").toLowerCase();
    return conversation.title.toLowerCase().includes(contactQuery) || inviteCode.includes(contactQuery);
  });
}

export function filterFriendsByQuery(
  friends: SessionUserPayload["user"][],
  contactQuery: string
): SessionUserPayload["user"][] {
  if (!contactQuery) return friends;
  return friends.filter((friend) => {
    const wallet = friend.primaryWalletAddress.toLowerCase();
    return friend.nickname.toLowerCase().includes(contactQuery) || wallet.includes(contactQuery);
  });
}

export function getTodayMomentsCount(moments: MomentView[]): number {
  const now = new Date();
  return moments.filter((moment) => {
    const created = new Date(moment.createdAt);
    return (
      created.getFullYear() === now.getFullYear() &&
      created.getMonth() === now.getMonth() &&
      created.getDate() === now.getDate()
    );
  }).length;
}

