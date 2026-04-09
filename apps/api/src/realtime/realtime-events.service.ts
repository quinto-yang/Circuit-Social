import { Injectable } from "@nestjs/common";
import type { Server } from "socket.io";

import type { ConversationSummary, MessageView, MomentView } from "../store/store.types";
import type { NotificationRealtimePayload } from "../notifications/notifications.types";

@Injectable()
export class RealtimeEventsService {
  private server: Server | null = null;

  setServer(server: Server | null | undefined) {
    if (!server) {
      return;
    }
    this.server = server;
  }

  emitMessage(conversationId: number, message: MessageView) {
    this.server?.to(`conversation:${conversationId}`).emit("message:new", message);
  }

  emitConversationUpdated(
    updates: Array<{ userId: number; summaries: ConversationSummary[] }>
  ) {
    updates.forEach(({ userId, summaries }) => {
      this.server?.to(`user:${userId}`).emit("conversation:updated", summaries);
    });
  }

  emitFriendRequest(targetUserId: number, payload: unknown) {
    this.server?.to(`user:${targetUserId}`).emit("friend-request:new", payload);
  }

  emitMoment(userIds: number[], payload: MomentView) {
    userIds.forEach((userId) => {
      this.server?.to(`user:${userId}`).emit("moment:new", payload);
    });
  }

  emitNotification(userId: number, payload: NotificationRealtimePayload) {
    this.server?.to(`user:${userId}`).emit("notification:new", payload);
  }
}
