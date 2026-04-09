import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

import type { ConversationSummary, MessageView, MomentView, SessionUserPayload } from "@/lib/types";

type UseRealtimeSyncArgs = {
  session: SessionUserPayload | null | undefined;
  apiOrigin: string;
  onConversationUpdated: (items: ConversationSummary[]) => void;
  onMessageNew: (message: MessageView) => void;
  onFriendRequestNew: () => void;
  onMomentNew: (moment: MomentView) => void;
  onNotificationNew: () => void;
  onSessionEnded: () => void;
};

export function useRealtimeSync({
  session,
  apiOrigin,
  onConversationUpdated,
  onMessageNew,
  onFriendRequestNew,
  onMomentNew,
  onNotificationNew,
  onSessionEnded
}: UseRealtimeSyncArgs) {
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const prevHadSessionRef = useRef(false);
  const handlersRef = useRef({
    onConversationUpdated,
    onMessageNew,
    onFriendRequestNew,
    onMomentNew,
    onNotificationNew,
    onSessionEnded
  });

  useEffect(() => {
    handlersRef.current = {
      onConversationUpdated,
      onMessageNew,
      onFriendRequestNew,
      onMomentNew,
      onNotificationNew,
      onSessionEnded
    };
  }, [onConversationUpdated, onMessageNew, onFriendRequestNew, onMomentNew, onNotificationNew, onSessionEnded]);

  useEffect(() => {
    if (!session) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocketConnected(false);
      if (prevHadSessionRef.current) {
        prevHadSessionRef.current = false;
        handlersRef.current.onSessionEnded();
      }
      return;
    }
    prevHadSessionRef.current = true;

    const socket = io(apiOrigin, {
      withCredentials: true,
      transports: ["websocket", "polling"]
    });
    socketRef.current = socket;

    socket.on("connect", () => setSocketConnected(true));
    socket.on("disconnect", () => setSocketConnected(false));
    socket.on("conversation:updated", (items) => handlersRef.current.onConversationUpdated(items));
    socket.on("message:new", (message) => handlersRef.current.onMessageNew(message));
    socket.on("friend-request:new", () => handlersRef.current.onFriendRequestNew());
    socket.on("moment:new", (moment) => handlersRef.current.onMomentNew(moment));
    socket.on("notification:new", () => handlersRef.current.onNotificationNew());

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setSocketConnected(false);
    };
  }, [
    session,
    apiOrigin
  ]);

  return { socketRef, socketConnected };
}

