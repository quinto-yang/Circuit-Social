import { useCallback, type Dispatch, type SetStateAction } from "react";

import { api } from "@/lib/api";
import { decryptContent } from "@/lib/e2ee";
import type { ConversationSummary, MessageView } from "@/lib/types";

type UseConversationStateArgs = {
  currentUserId: number;
  secretKey: string | null;
  setConversations: Dispatch<SetStateAction<ConversationSummary[]>>;
  setMessages: Dispatch<SetStateAction<MessageView[]>>;
};

export function useConversationState({
  currentUserId,
  secretKey,
  setConversations,
  setMessages
}: UseConversationStateArgs) {
  const normalizeMessage = useCallback(
    (message: MessageView) => ({
      ...message,
      content: decryptContent({
        content: message.content,
        currentUserId,
        secretKey
      }),
      mine: message.sender.id === currentUserId
    }),
    [currentUserId, secretKey]
  );

  const normalizeConversation = useCallback(
    (conversation: ConversationSummary) => ({
      ...conversation,
      lastMessage: conversation.lastMessage
        ? {
            ...conversation.lastMessage,
            content: decryptContent({
              content: conversation.lastMessage.content,
              currentUserId,
              secretKey
            })
          }
        : null
    }),
    [currentUserId, secretKey]
  );

  const loadConversations = useCallback(async () => {
    const result = await api.get<{ conversations: ConversationSummary[] }>("/conversations");
    setConversations(result.conversations.map((conversation) => normalizeConversation(conversation)));
  }, [normalizeConversation, setConversations]);

  const mergeMessage = useCallback(
    (message: MessageView) => {
      const next = normalizeMessage(message);
      setMessages((previous) => {
        if (previous.some((item) => item.id === next.id)) return previous;
        return [...previous, next];
      });
    },
    [normalizeMessage, setMessages]
  );

  return {
    normalizeMessage,
    normalizeConversation,
    loadConversations,
    mergeMessage
  };
}

