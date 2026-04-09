import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { Socket } from "socket.io-client";

import { api } from "@/lib/api";
import type { ConversationSummary, MessageView, SessionUserPayload } from "@/lib/types";

type UseConversationSyncArgs = {
  session: SessionUserPayload | null | undefined;
  activeConversation: ConversationSummary | null;
  socketRef: MutableRefObject<Socket | null>;
  socketConnected: boolean;
  messagesRef: MutableRefObject<MessageView[]>;
  setMessages: Dispatch<SetStateAction<MessageView[]>>;
  normalizeMessage: (message: MessageView) => MessageView;
};

export function useConversationSync({
  session,
  activeConversation,
  socketRef,
  socketConnected,
  messagesRef,
  setMessages,
  normalizeMessage
}: UseConversationSyncArgs) {
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !activeConversation) return;
    socket.emit("subscribe:conversation", {
      conversationId: activeConversation.id
    });
    return () => {
      socket.emit("unsubscribe:conversation", {
        conversationId: activeConversation.id
      });
    };
  }, [activeConversation, socketRef]);

  useEffect(() => {
    if (!session || !activeConversation || socketConnected) return;
    const interval = window.setInterval(async () => {
      const lastId = messagesRef.current.at(-1)?.id;
      const result = await api.get<{ messages: MessageView[] }>(
        `/messages?conversation_id=${activeConversation.id}${lastId ? `&after_id=${lastId}` : ""}`
      );
      if (result.messages.length) {
        setMessages((previous) => {
          const seen = new Set(previous.map((item) => item.id));
          return [
            ...previous,
            ...result.messages
              .filter((item) => !seen.has(item.id))
              .map((item) => normalizeMessage(item))
          ];
        });
      }
    }, 3000);

    return () => window.clearInterval(interval);
  }, [activeConversation, messagesRef, normalizeMessage, session, setMessages, socketConnected]);
}

