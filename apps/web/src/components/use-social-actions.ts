import { useCallback, type Dispatch, type SetStateAction } from "react";

import { api } from "@/lib/api";
import { mapApiError } from "@/lib/api-error";
import type { ConversationSummary } from "@/lib/types";

type UseSocialActionsArgs = {
  disconnect: () => void;
  friendTarget: string;
  groupName: string;
  joinCode: string;
  setBusy: Dispatch<SetStateAction<string | null>>;
  setStatus: Dispatch<SetStateAction<string>>;
  setSession: Dispatch<SetStateAction<any>>;
  setActiveConversation: Dispatch<SetStateAction<ConversationSummary | null>>;
  setMessages: Dispatch<SetStateAction<any[]>>;
  setFriendTarget: Dispatch<SetStateAction<string>>;
  setModal: Dispatch<SetStateAction<any>>;
  setGroupName: Dispatch<SetStateAction<string>>;
  setJoinCode: Dispatch<SetStateAction<string>>;
  loadContacts: () => Promise<void>;
  loadConversations: () => Promise<void>;
  openConversation: (conversation: ConversationSummary) => Promise<void>;
};

export function useSocialActions({
  disconnect,
  friendTarget,
  groupName,
  joinCode,
  setBusy,
  setStatus,
  setSession,
  setActiveConversation,
  setMessages,
  setFriendTarget,
  setModal,
  setGroupName,
  setJoinCode,
  loadContacts,
  loadConversations,
  openConversation
}: UseSocialActionsArgs) {
  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
      disconnect();
      setSession(null);
      setActiveConversation(null);
      setMessages([]);
    } catch (error) {
      setStatus(mapApiError(error, "退出失败"));
    }
  }, [disconnect, setActiveConversation, setMessages, setSession, setStatus]);

  const submitFriendRequest = useCallback(async () => {
    if (!friendTarget.trim()) return;
    setBusy("friend-request");
    try {
      await api.post("/friend-requests", {
        target: friendTarget.trim()
      });
      setFriendTarget("");
      setModal(null);
      await loadContacts();
      setStatus("好友申请已发送");
    } catch (error) {
      setStatus(mapApiError(error, "发送失败"));
    } finally {
      setBusy(null);
    }
  }, [friendTarget, loadContacts, setBusy, setFriendTarget, setModal, setStatus]);

  const answerRequest = useCallback(
    async (requestId: number, action: "accept" | "decline") => {
      setBusy(`request-${requestId}`);
      try {
        await api.post(`/friend-requests/${requestId}/respond`, { action });
        await Promise.all([loadContacts(), loadConversations()]);
      } catch (error) {
        setStatus(mapApiError(error, "处理失败"));
      } finally {
        setBusy(null);
      }
    },
    [loadContacts, loadConversations, setBusy, setStatus]
  );

  const createGroup = useCallback(async () => {
    if (!groupName.trim()) return;
    setBusy("create-group");
    try {
      const result = await api.post<{ conversation: ConversationSummary }>("/groups", {
        name: groupName.trim()
      });
      setGroupName("");
      setModal(null);
      await loadConversations();
      await openConversation(result.conversation);
    } catch (error) {
      setStatus(mapApiError(error, "创建失败"));
    } finally {
      setBusy(null);
    }
  }, [groupName, loadConversations, openConversation, setBusy, setGroupName, setModal, setStatus]);

  const joinGroup = useCallback(async () => {
    if (!joinCode.trim()) return;
    setBusy("join-group");
    try {
      await api.post("/groups/join", {
        inviteCode: joinCode.trim().toUpperCase()
      });
      setJoinCode("");
      setModal(null);
      await loadConversations();
    } catch (error) {
      setStatus(mapApiError(error, "加入失败"));
    } finally {
      setBusy(null);
    }
  }, [joinCode, loadConversations, setBusy, setJoinCode, setModal, setStatus]);

  const startDm = useCallback(
    async (peerId: number) => {
      try {
        const result = await api.post<{ conversation: ConversationSummary }>("/conversations/dm", { peerId });
        await loadConversations();
        await openConversation(result.conversation);
      } catch (error) {
        setStatus(mapApiError(error, "无法创建私聊"));
      }
    },
    [loadConversations, openConversation, setStatus]
  );

  return {
    logout,
    submitFriendRequest,
    answerRequest,
    createGroup,
    joinGroup,
    startDm
  };
}

