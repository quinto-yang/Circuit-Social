import { Inject, Injectable } from "@nestjs/common";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { RealtimeEventsService } from "../realtime/realtime-events.service";
import { MemoryStoreService } from "../store/memory-store.service";

const MAX_UPLOAD_IMAGE_SIZE = 10 * 1024 * 1024;

@Injectable()
export class SocialService {
  constructor(
    @Inject(MemoryStoreService) private readonly store: MemoryStoreService,
    @Inject(RealtimeEventsService) private readonly realtime: RealtimeEventsService
  ) {}

  private emitConversationRefresh(userIds: number[]) {
    this.realtime.emitConversationUpdated(
      userIds.map((userId) => ({
        userId,
        summaries: this.store.listConversationSummaries(userId)
      }))
    );
  }

  listFriends(userId: number) {
    return {
      friends: this.store.getFriends(userId)
    };
  }

  listFriendRequests(userId: number) {
    return this.store.getFriendRequests(userId);
  }

  createFriendRequest(userId: number, target: string) {
    const normalized = target.trim();
    const request = /^\d+$/.test(normalized)
      ? this.store.createFriendRequest(userId, { userId: Number(normalized) })
      : this.store.createFriendRequest(userId, { address: normalized });
    this.realtime.emitFriendRequest(request.toUserId, {
      requestId: request.id,
      from: this.store.toPublicUser(userId)
    });
    return {
      request
    };
  }

  respondFriendRequest(userId: number, requestId: number, action: "accept" | "decline") {
    const request = this.store.respondFriendRequest(userId, requestId, action);
    if (action === "accept") {
      this.emitConversationRefresh([request.fromUserId, request.toUserId]);
    }
    return this.store.getFriendRequests(userId);
  }

  listConversations(userId: number) {
    return {
      conversations: this.store.listConversationSummaries(userId)
    };
  }

  startDirectConversation(userId: number, peerId: number) {
    if (!this.store.areFriends(userId, peerId) && userId !== peerId) {
      throw new Error("仅可与好友建立私聊");
    }
    const conversation = this.store.ensureDirectConversation(userId, peerId);
    this.emitConversationRefresh([userId, peerId]);
    return {
      conversation: this.serializeConversation(userId, conversation.id)
    };
  }

  createGroup(userId: number, name: string) {
    const conversation = this.store.createGroup(userId, name.trim());
    this.emitConversationRefresh([userId]);
    return {
      conversation: this.serializeConversation(userId, conversation.id)
    };
  }

  joinGroup(userId: number, inviteCode: string) {
    const conversation = this.store.joinGroup(userId, inviteCode);
    this.emitConversationRefresh(
      this.store.getConversationMembers(conversation.id).map((member) => member.userId)
    );
    return {
      conversation: this.serializeConversation(userId, conversation.id)
    };
  }

  getGroup(userId: number, groupId: number) {
    const conversation = this.store.getConversationById(groupId);
    const membership = this.store.getConversationMember(groupId, userId);
    if (!conversation || conversation.kind !== "group" || !membership) {
      throw new Error("群不存在");
    }
    return {
      group: this.serializeConversation(userId, groupId)
    };
  }

  getGroupMembers(userId: number, groupId: number) {
    const membership = this.store.getConversationMember(groupId, userId);
    if (!membership) throw new Error("无权限");
    return {
      members: this.store.getConversationMembers(groupId).map((member) => ({
        ...this.store.toPublicUser(member.userId),
        role: member.role,
        mutedUntil: member.mutedUntil
      })),
      myRole: membership.role
    };
  }

  kickGroupMember(userId: number, groupId: number, targetUserId: number) {
    this.store.kickGroupMember(userId, groupId, targetUserId);
    this.emitConversationRefresh(
      this.store.getConversationMembers(groupId).map((member) => member.userId)
    );
    return this.getGroupMembers(userId, groupId);
  }

  muteGroupMember(userId: number, groupId: number, targetUserId: number, minutes: number) {
    this.store.muteGroupMember(userId, groupId, targetUserId, minutes);
    return this.getGroupMembers(userId, groupId);
  }

  leaveGroup(userId: number, groupId: number) {
    const affected = this.store
      .getConversationMembers(groupId)
      .map((member) => member.userId)
      .filter((memberId) => memberId !== userId);
    const result = this.store.leaveGroup(userId, groupId);
    this.emitConversationRefresh([userId, ...affected]);
    return result;
  }

  listMessages(
    userId: number,
    input: { conversationId: number; beforeId?: number; afterId?: number }
  ) {
    return {
      messages: this.store.listMessages(userId, input)
    };
  }

  listConversationParticipants(userId: number, conversationId: number) {
    const membership = this.store.getConversationMember(conversationId, userId);
    if (!membership) throw new Error("无权限访问该会话");
    return {
      participants: this.store.getConversationParticipants(conversationId)
    };
  }

  sendMessage(
    userId: number,
    input: { conversationId: number; content: string; mentionUserIds?: number[] }
  ) {
    const message = this.store.sendMessage(userId, input);
    const participants = this.store
      .getConversationMembers(input.conversationId)
      .map((member) => member.userId);
    const normalized = {
      ...this.store.toMessageView(userId, message),
      mine: false
    };
    this.realtime.emitMessage(input.conversationId, normalized);
    this.emitConversationRefresh(participants);
    return {
      message: this.store.toMessageView(userId, message)
    };
  }

  markRead(userId: number, conversationId: number, messageId: number | null) {
    this.store.markRead(userId, conversationId, messageId);
    this.emitConversationRefresh([userId]);
    return { ok: true };
  }

  listMoments(userId: number, beforeId?: number) {
    return {
      moments: this.store.listMoments(userId, beforeId)
    };
  }

  createMoment(userId: number, input: { content: string; uploadIds: number[] }) {
    const moment = this.store.createMoment(userId, input);
    const payload = this.store.toMomentView(userId, moment);
    const targets = [
      userId,
      ...this.store.getFriends(userId).map((friend) => friend.id)
    ];
    this.realtime.emitMoment(Array.from(new Set(targets)), payload);
    return {
      moment: payload
    };
  }

  async uploadImage(userId: number, file: Express.Multer.File) {
    if (!file) throw new Error("请上传图片");
    if (!file.mimetype.startsWith("image/")) {
      throw new Error("仅支持图片上传");
    }
    if (file.size > MAX_UPLOAD_IMAGE_SIZE) {
      throw new Error("图片不能超过 10MB");
    }
    const uploadsDir = process.env.UPLOADS_DIR
      ? path.resolve(process.env.UPLOADS_DIR)
      : path.resolve(__dirname, "..", "..", "uploads");
    await mkdir(uploadsDir, { recursive: true });
    const extension =
      path.extname(file.originalname) ||
      (file.mimetype === "image/png" ? ".png" : ".jpg");
    const fileName = `${Date.now()}-${randomUUID()}${extension}`;
    const diskPath = path.join(uploadsDir, fileName);
    await writeFile(diskPath, file.buffer);
    const upload = this.store.createUpload({
      userId,
      url: `/static/uploads/${fileName}`,
      fileName: file.originalname,
      mimeType: file.mimetype,
      size: file.size
    });
    return {
      upload
    };
  }

  createReport(userId: number, input: { kind: "moment" | "message"; targetId: number; reason: string }) {
    return {
      report: this.store.createReport({
        reporterId: userId,
        ...input
      })
    };
  }

  updateProfile(userId: number, input: {
    nickname?: string;
    bio?: string;
    avatarUrl?: string | null;
    didUri?: string | null;
    primaryWalletId?: number;
    encryptionPublicKey?: string | null;
  }) {
    if (input.primaryWalletId) {
      this.store.setPrimaryWallet(userId, input.primaryWalletId);
    }
    this.store.updateProfile({
      userId,
      nickname: input.nickname?.trim(),
      bio: input.bio?.trim(),
      avatarUrl: input.avatarUrl,
      didUri: input.didUri?.trim() || null,
      encryptionPublicKey: input.encryptionPublicKey
    });
    return {
      ...this.store.toPublicUser(userId),
      wallets: this.store.getUserWallets(userId)
    };
  }

  private serializeConversation(userId: number, conversationId: number) {
    const conversation = this.store.listConversationSummaries(userId).find(
      (item) => item.id === conversationId
    );
    if (!conversation) {
      throw new Error("会话不存在");
    }
    return conversation;
  }
}
