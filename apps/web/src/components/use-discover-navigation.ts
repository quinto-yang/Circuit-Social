import { useCallback, type Dispatch, type SetStateAction } from "react";

import { api } from "@/lib/api";
import { mapApiError } from "@/lib/api-error";
import type { ConversationSummary, TabKey } from "@/lib/types";

type UseDiscoverNavigationArgs = {
  conversations: ConversationSummary[];
  normalizeConversation: (conversation: ConversationSummary) => ConversationSummary;
  setConversations: Dispatch<SetStateAction<ConversationSummary[]>>;
  setTab: Dispatch<SetStateAction<TabKey>>;
  setActiveConversation: Dispatch<SetStateAction<ConversationSummary | null>>;
  flashStatus: (message: string, durationMs?: number) => void;
  setStatus: Dispatch<SetStateAction<string>>;
  t: (zh: string, en: string) => string;
};

export function useDiscoverNavigation({
  conversations,
  normalizeConversation,
  setConversations,
  setTab,
  setActiveConversation,
  flashStatus,
  setStatus,
  t
}: UseDiscoverNavigationArgs) {
  return useCallback(
    async (conversationId: number) => {
      const existing = conversations.find((c) => c.id === conversationId);
      if (existing) {
        setTab("chats");
        setActiveConversation(existing);
        return;
      }
      try {
        const result = await api.get<{ conversations: ConversationSummary[] }>("/conversations");
        const mapped = result.conversations.map((conversation) => normalizeConversation(conversation));
        setConversations(mapped);
        const found = mapped.find((c) => c.id === conversationId);
        if (found) {
          setTab("chats");
          setActiveConversation(found);
        } else {
          flashStatus(t("未找到该群聊", "Group not found"));
        }
      } catch (error) {
        setStatus(mapApiError(error, t("加载会话失败", "Failed to load conversations")));
      }
    },
    [
      conversations,
      flashStatus,
      normalizeConversation,
      setActiveConversation,
      setConversations,
      setStatus,
      setTab,
      t
    ]
  );
}

