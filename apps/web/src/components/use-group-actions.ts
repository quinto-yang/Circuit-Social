import { useCallback, type Dispatch, type SetStateAction } from "react";

import { api } from "@/lib/api";
import { mapApiError } from "@/lib/api-error";
import type { ConversationSummary, GroupMember, MessageView } from "@/lib/types";

type UseGroupActionsArgs = {
  activeConversation: ConversationSummary | null;
  setGroupMembers: Dispatch<SetStateAction<GroupMember[]>>;
  setGroupRole: Dispatch<SetStateAction<"owner" | "member">>;
  setActiveConversation: Dispatch<SetStateAction<ConversationSummary | null>>;
  setMessages: Dispatch<SetStateAction<MessageView[]>>;
  loadConversations: () => Promise<void>;
  setStatus: Dispatch<SetStateAction<string>>;
};

export function useGroupActions({
  activeConversation,
  setGroupMembers,
  setGroupRole,
  setActiveConversation,
  setMessages,
  loadConversations,
  setStatus
}: UseGroupActionsArgs) {
  const kickMember = useCallback(
    async (memberId: number) => {
      if (!activeConversation) return;
      if (!window.confirm("确定移出该成员？")) return;
      try {
        const result = await api.post<{ members: GroupMember[]; myRole: "owner" | "member" }>(
          `/groups/${activeConversation.id}/kick`,
          {
            userId: memberId
          }
        );
        setGroupMembers(result.members);
        setGroupRole(result.myRole);
      } catch (error) {
        setStatus(mapApiError(error, "操作失败"));
      }
    },
    [activeConversation, setGroupMembers, setGroupRole, setStatus]
  );

  const toggleMute = useCallback(
    async (member: GroupMember) => {
      if (!activeConversation) return;
      const muted = member.mutedUntil && new Date(member.mutedUntil).getTime() > Date.now();
      const minutes = muted ? 0 : Number(window.prompt("禁言分钟数", "60") ?? "0");
      if (!muted && !minutes) return;
      try {
        const result = await api.post<{ members: GroupMember[]; myRole: "owner" | "member" }>(
          `/groups/${activeConversation.id}/mute`,
          {
            userId: member.id,
            minutes
          }
        );
        setGroupMembers(result.members);
        setGroupRole(result.myRole);
      } catch (error) {
        setStatus(mapApiError(error, "操作失败"));
      }
    },
    [activeConversation, setGroupMembers, setGroupRole, setStatus]
  );

  const leaveGroup = useCallback(async () => {
    if (!activeConversation) return;
    if (!window.confirm("确定退出当前群聊？")) return;
    try {
      await api.post(`/groups/${activeConversation.id}/leave`);
      setActiveConversation(null);
      setMessages([]);
      await loadConversations();
    } catch (error) {
      setStatus(mapApiError(error, "退群失败"));
    }
  }, [activeConversation, loadConversations, setActiveConversation, setMessages, setStatus]);

  return { kickMember, toggleMute, leaveGroup };
}

