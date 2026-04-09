import { useCallback, type Dispatch, type SetStateAction } from "react";

import { api } from "@/lib/api";
import { mapApiError } from "@/lib/api-error";
import { encryptForParticipants } from "@/lib/e2ee";
import type { ConversationSummary, MessageView, SessionUserPayload } from "@/lib/types";

type UseMessageActionsArgs = {
  activeConversation: ConversationSummary | null;
  messageDraft: string;
  selectedMentions: number[];
  e2eeKeyPair: { publicKey: string; secretKey: string } | null;
  setBusy: Dispatch<SetStateAction<string | null>>;
  setConversationEncryptionFallback: Dispatch<SetStateAction<Record<number, boolean>>>;
  mergeMessage: (message: MessageView) => void;
  setMessageDraft: Dispatch<SetStateAction<string>>;
  setSelectedMentions: Dispatch<SetStateAction<number[]>>;
  loadConversations: () => Promise<void>;
  setStatus: Dispatch<SetStateAction<string>>;
};

export function useMessageActions({
  activeConversation,
  messageDraft,
  selectedMentions,
  e2eeKeyPair,
  setBusy,
  setConversationEncryptionFallback,
  mergeMessage,
  setMessageDraft,
  setSelectedMentions,
  loadConversations,
  setStatus
}: UseMessageActionsArgs) {
  const sendMessage = useCallback(async () => {
    if (!activeConversation || !messageDraft.trim()) return;
    setBusy("send-message");
    try {
      const content = messageDraft.trim();
      if (!e2eeKeyPair) {
        throw new Error("加密密钥未初始化，请稍后重试");
      }
      const participantsResult = await api.get<{ participants: SessionUserPayload["user"][] }>(
        `/conversations/${activeConversation.id}/participants`
      );
      let outboundContent = content;
      try {
        outboundContent = encryptForParticipants({
          plainText: content,
          senderPublicKey: e2eeKeyPair.publicKey,
          senderSecretKey: e2eeKeyPair.secretKey,
          recipients: participantsResult.participants.map((participant) => ({
            userId: participant.id,
            encryptionPublicKey: participant.encryptionPublicKey
          }))
        });
      } catch {
        // Fallback to plaintext so messaging is not blocked
        // when some conversation participants have not initialized keys yet.
        setConversationEncryptionFallback((previous) => ({
          ...previous,
          [activeConversation.id]: true
        }));
      }
      const result = await api.post<{ message: MessageView }>("/messages", {
        conversationId: activeConversation.id,
        content: outboundContent,
        mentionUserIds: selectedMentions
      });
      mergeMessage(result.message);
      setMessageDraft("");
      setSelectedMentions([]);
      await loadConversations();
    } catch (error) {
      setStatus(mapApiError(error, "消息发送失败"));
    } finally {
      setBusy(null);
    }
  }, [
    activeConversation,
    e2eeKeyPair,
    loadConversations,
    mergeMessage,
    messageDraft,
    selectedMentions,
    setBusy,
    setConversationEncryptionFallback,
    setMessageDraft,
    setSelectedMentions,
    setStatus
  ]);

  return { sendMessage };
}

