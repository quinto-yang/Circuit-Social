import { useCallback, type Dispatch, type SetStateAction } from "react";

import { api } from "@/lib/api";
import { mapApiError } from "@/lib/api-error";
import type { ConversationSummary, GroupMember, MessageView, SessionUserPayload } from "@/lib/types";

type UseOpenConversationArgs = {
  normalizeMessage: (message: MessageView) => MessageView;
  setBusy: Dispatch<SetStateAction<string | null>>;
  setActiveConversation: Dispatch<SetStateAction<ConversationSummary | null>>;
  setMessages: Dispatch<SetStateAction<MessageView[]>>;
  setSelectedMentions: Dispatch<SetStateAction<number[]>>;
  setGroupManageOpen: Dispatch<SetStateAction<boolean>>;
  setMessageDraft: Dispatch<SetStateAction<string>>;
  setGroupMembers: Dispatch<SetStateAction<GroupMember[]>>;
  setGroupRole: Dispatch<SetStateAction<"owner" | "member">>;
  setConversationEncryptionEnabled: Dispatch<SetStateAction<Record<number, boolean>>>;
  setStatus: Dispatch<SetStateAction<string>>;
};

export function useOpenConversation({
  normalizeMessage,
  setBusy,
  setActiveConversation,
  setMessages,
  setSelectedMentions,
  setGroupManageOpen,
  setMessageDraft,
  setGroupMembers,
  setGroupRole,
  setConversationEncryptionEnabled,
  setStatus
}: UseOpenConversationArgs) {
  return useCallback(
    async (conversation: ConversationSummary) => {
      setBusy("conversation");
      try {
        const [messageResult, participantsResult, groupResult] = await Promise.all([
          api.get<{ messages: MessageView[] }>(`/messages?conversation_id=${conversation.id}`),
          api.get<{ participants: SessionUserPayload["user"][] }>(
            `/conversations/${conversation.id}/participants`
          ),
          conversation.kind === "group"
            ? api.get<{ members: GroupMember[]; myRole: "owner" | "member" }>(
                `/groups/${conversation.id}/members`
              )
            : Promise.resolve(null)
        ]);

        setActiveConversation(conversation);
        setMessages(messageResult.messages.map((message) => normalizeMessage(message)));
        setSelectedMentions([]);
        setGroupManageOpen(false);
        setMessageDraft("");
        setGroupMembers(groupResult?.members ?? []);
        setGroupRole(groupResult?.myRole ?? "member");
        setConversationEncryptionEnabled((previous) => ({
          ...previous,
          [conversation.id]: participantsResult.participants.every(
            (participant) => !!participant.encryptionPublicKey
          )
        }));
        const lastMessageId = messageResult.messages.at(-1)?.id ?? null;
        void api.post("/messages/read", {
          conversationId: conversation.id,
          messageId: lastMessageId
        });
      } catch (error) {
        setStatus(mapApiError(error, "无法打开会话"));
      } finally {
        setBusy(null);
      }
    },
    [
      normalizeMessage,
      setActiveConversation,
      setBusy,
      setConversationEncryptionEnabled,
      setGroupManageOpen,
      setGroupMembers,
      setGroupRole,
      setMessageDraft,
      setMessages,
      setSelectedMentions,
      setStatus
    ]
  );
}

