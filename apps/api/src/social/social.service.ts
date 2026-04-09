import { Inject, Injectable } from "@nestjs/common";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { RealtimeEventsService } from "../realtime/realtime-events.service";
import { MemoryStoreService } from "../store/memory-store.service";
import { NotificationsService } from "../notifications/notifications.service";

const MAX_UPLOAD_IMAGE_SIZE = 10 * 1024 * 1024;

@Injectable()
export class SocialService {
  constructor(
    @Inject(MemoryStoreService) private readonly store: MemoryStoreService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RealtimeEventsService) private readonly realtime: RealtimeEventsService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService
  ) {}

  private get prismaEnabled() {
    return Boolean(process.env.DATABASE_URL);
  }

  discoverHot(userId: number) {
    if (this.prismaEnabled) {
      return this.discoverHotPrisma(userId);
    }
    return this.store.discoverHot(userId);
  }

  async listTasks(userId: number) {
    if (this.prismaEnabled) {
      await this.ensureDefaultTasksPrisma();
      const defs = await this.prisma.taskDefinition.findMany({ where: { enabled: true }, orderBy: { key: "asc" } });
      const progresses = await this.prisma.taskProgress.findMany({ where: { userId } });
      const byKey = new Map(progresses.map((p) => [p.taskKey, p]));
      const rewards = await this.prisma.pointLedger.findMany({
        where: { userId, reason: "task.reward", refType: "task" },
        select: { refId: true }
      });
      const claimed = new Set(rewards.map((r) => r.refId).filter((x): x is string => Boolean(x)));
      return {
        ok: true,
        tasks: defs.map((def) => {
          const p = byKey.get(def.key);
          const progress = Math.min(p?.progress ?? 0, def.target);
          const completedAt = p?.completedAt ? p.completedAt.toISOString() : null;
          const completed = Boolean(completedAt) || progress >= def.target;
          return {
            key: def.key,
            titleZh: def.titleZh,
            titleEn: def.titleEn,
            descriptionZh: def.descriptionZh,
            descriptionEn: def.descriptionEn,
            target: def.target,
            points: def.points,
            progress,
            completedAt,
            canClaim: completed && !claimed.has(def.key)
          };
        })
      };
    }
    return { ok: true, ...this.store.listTasks(userId) };
  }

  async claimTask(userId: number, taskKey: string) {
    if (this.prismaEnabled) {
      await this.ensureDefaultTasksPrisma();
      const def = await this.prisma.taskDefinition.findUnique({ where: { key: taskKey } });
      if (!def || !def.enabled) throw new Error("任务不存在");
      const progress = await this.prisma.taskProgress.findUnique({
        where: { userId_taskKey: { userId, taskKey } }
      });
      const completed = Boolean(progress?.completedAt) || (progress?.progress ?? 0) >= def.target;
      if (!completed) throw new Error("任务未完成");
      const refId = taskKey;
      try {
        await this.prisma.pointLedger.create({
          data: { userId, delta: def.points, reason: "task.reward", refType: "task", refId }
        });
        return { ok: true, claimed: true, delta: def.points };
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          return { ok: true, claimed: false };
        }
        throw error;
      }
    }
    return this.store.claimTask(userId, taskKey);
  }

  async getPoints(userId: number) {
    if (this.prismaEnabled) {
      const rows = await this.prisma.pointLedger.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 30
      });
      const totalAgg = await this.prisma.pointLedger.aggregate({
        where: { userId },
        _sum: { delta: true }
      });
      return {
        ok: true,
        total: totalAgg._sum.delta ?? 0,
        ledger: rows.map((r) => ({
          userId: r.userId,
          delta: r.delta,
          reason: r.reason,
          refType: r.refType ?? null,
          refId: r.refId ?? null,
          createdAt: r.createdAt.toISOString()
        }))
      };
    }
    return { ok: true, ...this.store.getPoints(userId) };
  }

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
    this.onInteraction(userId, { type: "moment.create", refId: String(payload.id) });
    return {
      moment: payload
    };
  }

  listMomentComments(userId: number, momentId: number) {
    if (this.prismaEnabled) {
      return this.listMomentCommentsPrisma(userId, momentId);
    }
    return {
      comments: this.store.listMomentComments(userId, momentId)
    };
  }

  toggleMomentLike(userId: number, momentId: number) {
    if (this.prismaEnabled) {
      return this.toggleMomentLikePrisma(userId, momentId);
    }
    const res = this.store.toggleMomentLike(userId, momentId);
    if (res.liked) {
      this.onInteraction(userId, { type: "moment.like", refId: String(momentId) });
    }
    return res;
  }

  createMomentComment(
    userId: number,
    momentId: number,
    input: { content: string; parentCommentId?: number | null }
  ) {
    if (this.prismaEnabled) {
      return this.createMomentCommentPrisma(userId, momentId, input);
    }
    this.store.createMomentComment(userId, {
      momentId,
      content: input.content,
      parentCommentId: input.parentCommentId ?? null
    });
    this.onInteraction(userId, { type: "moment.comment", refId: `${momentId}` });
    return this.listMomentComments(userId, momentId);
  }

  private async createMomentCommentPrisma(
    userId: number,
    momentId: number,
    input: { content: string; parentCommentId?: number | null }
  ) {
    const moment = await this.prisma.moment.findUnique({ where: { id: momentId } });
    if (!moment) throw new Error("动态不存在");

    let replyToUserId: number | null = null;
    const parentCommentId = input.parentCommentId ?? null;
    if (parentCommentId) {
      const parent = await this.prisma.momentComment.findUnique({ where: { id: parentCommentId } });
      if (!parent || parent.momentId !== momentId) throw new Error("父评论不存在");
      replyToUserId = parent.authorId;
    }

    const comment = await this.prisma.momentComment.create({
      data: {
        momentId,
        authorId: userId,
        content: input.content,
        parentCommentId
      }
    });

    await this.onInteraction(userId, { type: "moment.comment", refId: `${momentId}` });

    try {
      if (replyToUserId) {
        await this.notifications.notifyReply(userId, momentId, comment.id, replyToUserId);
      } else {
        await this.notifications.notifyMomentComment(userId, momentId, comment.id);
      }
    } catch {
      // notifications are best-effort
    }

    return this.listMomentComments(userId, momentId);
  }

  toggleMomentCommentLike(userId: number, momentId: number, commentId: number) {
    if (this.prismaEnabled) {
      return this.toggleMomentCommentLikePrisma(userId, momentId, commentId);
    }
    const res = this.store.toggleMomentCommentLike(userId, momentId, commentId);
    if (res.liked) {
      this.onInteraction(userId, { type: "comment.like", refId: String(commentId) });
    }
    return res;
  }

  toggleMomentCommentPin(userId: number, momentId: number, commentId: number) {
    if (this.prismaEnabled) {
      return this.toggleMomentCommentPinPrisma(userId, momentId, commentId);
    }
    return this.store.toggleMomentCommentPin(userId, momentId, commentId);
  }

  private async toggleMomentLikePrisma(userId: number, momentId: number) {
    const existing = await this.prisma.momentLike.findUnique({
      where: { momentId_userId: { momentId, userId } }
    });
    if (existing) {
      await this.prisma.momentLike.delete({ where: { id: existing.id } });
      const count = await this.prisma.momentLike.count({ where: { momentId } });
      return { liked: false, count };
    }
    await this.prisma.momentLike.create({ data: { momentId, userId } });
    const count = await this.prisma.momentLike.count({ where: { momentId } });
    await this.onInteraction(userId, { type: "moment.like", refId: String(momentId) });
    try {
      await this.notifications.notifyMomentLike(userId, momentId);
    } catch {
      // notifications are best-effort
    }
    return { liked: true, count };
  }

  private async toggleMomentCommentLikePrisma(userId: number, momentId: number, commentId: number) {
    const comment = await this.prisma.momentComment.findUnique({ where: { id: commentId } });
    if (!comment || comment.momentId !== momentId) throw new Error("评论不存在");
    const existing = await this.prisma.momentCommentLike.findUnique({
      where: { commentId_userId: { commentId, userId } }
    });
    if (existing) {
      await this.prisma.momentCommentLike.delete({ where: { id: existing.id } });
      const count = await this.prisma.momentCommentLike.count({ where: { commentId } });
      return { liked: false, count };
    }
    await this.prisma.momentCommentLike.create({ data: { commentId, userId } });
    const count = await this.prisma.momentCommentLike.count({ where: { commentId } });
    await this.onInteraction(userId, { type: "comment.like", refId: String(commentId) });
    try {
      await this.notifications.notifyReply(userId, momentId, commentId, comment.authorId);
    } catch {
      // notifications are best-effort
    }
    return { liked: true, count };
  }

  private async toggleMomentCommentPinPrisma(userId: number, momentId: number, commentId: number) {
    const moment = await this.prisma.moment.findUnique({ where: { id: momentId } });
    if (!moment) throw new Error("动态不存在");
    if (moment.authorId !== userId) throw new Error("仅作者可置顶评论");
    const comment = await this.prisma.momentComment.findUnique({ where: { id: commentId } });
    if (!comment || comment.momentId !== momentId) throw new Error("评论不存在");
    const existing = await this.prisma.momentCommentPin.findUnique({ where: { momentId } });
    if (existing?.commentId === commentId) {
      await this.prisma.momentCommentPin.delete({ where: { id: existing.id } });
      return { pinned: false };
    }
    await this.prisma.momentCommentPin.upsert({
      where: { momentId },
      create: { momentId, commentId, pinnedByUserId: userId },
      update: { commentId, pinnedByUserId: userId, pinnedAt: new Date() }
    });
    return { pinned: true };
  }

  private async listMomentCommentsPrisma(userId: number, momentId: number) {
    const moment = await this.prisma.moment.findUnique({ where: { id: momentId } });
    if (!moment) throw new Error("动态不存在");
    const pinned = await this.prisma.momentCommentPin.findUnique({ where: { momentId } });
    const comments = await this.prisma.momentComment.findMany({
      where: { momentId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      include: { author: true }
    });
    const likeCounts = await this.prisma.momentCommentLike.groupBy({
      by: ["commentId"],
      where: { commentId: { in: comments.map((c) => c.id) } },
      _count: { _all: true }
    });
    const likedByMe = await this.prisma.momentCommentLike.findMany({
      where: { userId, commentId: { in: comments.map((c) => c.id) } },
      select: { commentId: true }
    });
    const likeCountMap = new Map(likeCounts.map((row) => [row.commentId, row._count._all]));
    const likedSet = new Set(likedByMe.map((row) => row.commentId));

    const views = comments.map((comment) => ({
      id: comment.id,
      momentId: comment.momentId,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      parentCommentId: comment.parentCommentId,
      author: {
        id: comment.author.id,
        nickname: comment.author.nickname,
        bio: comment.author.bio ?? "",
        avatarUrl: comment.author.avatarUrl ?? null,
        didUri: null,
        encryptionPublicKey: null,
        primaryWalletAddress: "",
        primaryChainId: 0,
        primaryChainLabel: ""
      },
      mine: comment.authorId === userId,
      canDelete: comment.authorId === userId || moment.authorId === userId,
      likeCount: likeCountMap.get(comment.id) ?? 0,
      likedByMe: likedSet.has(comment.id),
      pinned: pinned?.commentId === comment.id,
      replies: [] as any[]
    }));

    const byId = new Map<number, any>();
    views.forEach((v) => byId.set(v.id, v));
    const roots: any[] = [];
    views.forEach((v) => {
      if (!v.parentCommentId) {
        roots.push(v);
        return;
      }
      const parent = byId.get(v.parentCommentId);
      if (!parent) {
        roots.push(v);
        return;
      }
      parent.replies.push(v);
    });

    const pinnedId = pinned?.commentId ?? null;
    const score = (c: any) => c.likeCount ?? 0;
    roots.sort((a, b) => {
      if (pinnedId && a.id === pinnedId) return -1;
      if (pinnedId && b.id === pinnedId) return 1;
      const diff = score(b) - score(a);
      if (diff !== 0) return diff;
      const ta = new Date(a.createdAt).getTime();
      const tb = new Date(b.createdAt).getTime();
      if (ta !== tb) return ta - tb;
      return a.id - b.id;
    });
    return { comments: roots };
  }

  private async ensureDefaultTasksPrisma() {
    const defaults = [
      {
        key: "first_moment",
        titleZh: "发布第一条动态",
        titleEn: "Publish your first moment",
        descriptionZh: "完成一次朋友圈发布。",
        descriptionEn: "Create a moment post once.",
        target: 1,
        points: 10
      },
      {
        key: "first_like",
        titleZh: "完成第一次点赞",
        titleEn: "Give your first like",
        descriptionZh: "对任意动态点一次赞。",
        descriptionEn: "Like any moment once.",
        target: 1,
        points: 2
      },
      {
        key: "first_comment",
        titleZh: "完成第一次评论",
        titleEn: "Write your first comment",
        descriptionZh: "对任意动态发一条评论。",
        descriptionEn: "Comment on any moment once.",
        target: 1,
        points: 4
      },
      {
        key: "complete_profile",
        titleZh: "完善个人资料",
        titleEn: "Complete your profile",
        descriptionZh: "设置头像，并填写昵称与简介。",
        descriptionEn: "Set an avatar and fill nickname & bio.",
        target: 1,
        points: 8
      },
      {
        key: "join_group",
        titleZh: "加入一个群聊",
        titleEn: "Join a group",
        descriptionZh: "加入任意群聊会话。",
        descriptionEn: "Join any group conversation.",
        target: 1,
        points: 6
      }
    ];
    await Promise.all(
      defaults.map((t) =>
        this.prisma.taskDefinition.upsert({
          where: { key: t.key },
          create: { ...t, enabled: true },
          update: { ...t, enabled: true }
        })
      )
    );
  }

  private async onInteraction(userId: number, input: { type: string; refId: string }) {
    if (this.prismaEnabled) {
      await this.ensureDefaultTasksPrisma();
      if (input.type === "moment.create") {
        await this.prisma.taskProgress.upsert({
          where: { userId_taskKey: { userId, taskKey: "first_moment" } },
          create: { userId, taskKey: "first_moment", progress: 1, completedAt: new Date() },
          update: { progress: 1, completedAt: new Date() }
        });
      }
      if (input.type === "moment.like") {
        await this.prisma.taskProgress.upsert({
          where: { userId_taskKey: { userId, taskKey: "first_like" } },
          create: { userId, taskKey: "first_like", progress: 1, completedAt: new Date() },
          update: { progress: 1, completedAt: new Date() }
        });
      }
      if (input.type === "moment.comment") {
        await this.prisma.taskProgress.upsert({
          where: { userId_taskKey: { userId, taskKey: "first_comment" } },
          create: { userId, taskKey: "first_comment", progress: 1, completedAt: new Date() },
          update: { progress: 1, completedAt: new Date() }
        });
      }
      // Points are granted on claim to keep idempotency simple and transparent.
      return;
    }

    if (input.type === "moment.create") {
      this.store.bumpTaskProgress(userId, "first_moment", 1);
    } else if (input.type === "moment.like") {
      this.store.bumpTaskProgress(userId, "first_like", 1);
      this.store.awardPointsOnce({ userId, delta: 1, reason: "moment.like", refType: "moment", refId: input.refId });
    } else if (input.type === "moment.comment") {
      this.store.bumpTaskProgress(userId, "first_comment", 1);
      this.store.awardPointsOnce({ userId, delta: 2, reason: "moment.comment", refType: "moment", refId: input.refId });
    } else if (input.type === "comment.like") {
      this.store.awardPointsOnce({ userId, delta: 1, reason: "comment.like", refType: "comment", refId: input.refId });
    }
  }

  private async discoverHotPrisma(userId: number) {
    const windowHours = 72;
    const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);

    const moments = await this.prisma.moment.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 60,
      include: {
        author: true,
        images: { include: { upload: true } },
        _count: { select: { likes: true, comments: true } }
      }
    });

    const hotMoments = moments
      .map((moment) => {
        const likes = moment._count.likes;
        const comments = moment._count.comments;
        const score = likes * 3 + comments * 2;
        return {
          id: moment.id,
          score,
          reason: `likes=${likes}, comments=${comments}, window=${windowHours}h`,
          moment: {
            id: moment.id,
            content: moment.content,
            createdAt: moment.createdAt.toISOString(),
            author: {
              id: moment.author.id,
              nickname: moment.author.nickname,
              bio: moment.author.bio ?? "",
              avatarUrl: moment.author.avatarUrl ?? null,
              didUri: null,
              encryptionPublicKey: null,
              primaryWalletAddress: "",
              primaryChainId: 0,
              primaryChainLabel: ""
            },
            images: moment.images.map((ref) => ({
              id: ref.upload.id,
              userId: ref.upload.userId,
              url: ref.upload.url,
              fileName: ref.upload.fileName,
              mimeType: ref.upload.mimeType,
              size: ref.upload.size,
              createdAt: ref.upload.createdAt.toISOString()
            })),
            mine: moment.authorId === userId,
            likeCount: likes,
            commentCount: comments
          }
        };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.id - b.id;
      })
      .slice(0, 10);

    const groups = await this.prisma.conversation.findMany({
      where: { kind: "group" },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    const messageCounts = await this.prisma.message.groupBy({
      by: ["conversationId"],
      where: { createdAt: { gte: since } },
      _count: { _all: true }
    });
    const msgCountMap = new Map(messageCounts.map((row) => [row.conversationId, row._count._all]));

    const hotGroups = groups
      .map((g) => {
        const messages = msgCountMap.get(g.id) ?? 0;
        const score = messages;
        return { id: g.id, score, reason: `messages=${messages}, window=${windowHours}h`, group: g };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.id - b.id;
      })
      .slice(0, 10);

    const [likeByUser, commentByUser, msgByUser] = await Promise.all([
      this.prisma.momentLike.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: since } },
        _count: { _all: true }
      }),
      this.prisma.momentComment.groupBy({
        by: ["authorId"],
        where: { createdAt: { gte: since } },
        _count: { _all: true }
      }),
      this.prisma.message.groupBy({
        by: ["senderId"],
        where: { createdAt: { gte: since } },
        _count: { _all: true }
      })
    ]);

    const scoreMap = new Map<number, { likes: number; comments: number; messages: number }>();
    likeByUser.forEach((row) => scoreMap.set(row.userId, { likes: row._count._all, comments: 0, messages: 0 }));
    commentByUser.forEach((row) => {
      const prev = scoreMap.get(row.authorId) ?? { likes: 0, comments: 0, messages: 0 };
      scoreMap.set(row.authorId, { ...prev, comments: row._count._all });
    });
    msgByUser.forEach((row) => {
      const prev = scoreMap.get(row.senderId) ?? { likes: 0, comments: 0, messages: 0 };
      scoreMap.set(row.senderId, { ...prev, messages: row._count._all });
    });

    const userIds = Array.from(scoreMap.keys()).slice(0, 200);
    const users = await this.prisma.user.findMany({ where: { id: { in: userIds } } });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const recommendedUsers = Array.from(scoreMap.entries())
      .map(([id, parts]) => {
        const score = parts.likes + parts.comments * 2 + parts.messages;
        const user = userMap.get(id);
        if (!user) return null;
        return {
          id,
          score,
          reason: `likesGiven=${parts.likes}, commentsWritten=${parts.comments}, messagesSent=${parts.messages}, window=${windowHours}h`,
          user: {
            id: user.id,
            nickname: user.nickname,
            bio: user.bio ?? "",
            avatarUrl: user.avatarUrl ?? null,
            didUri: null,
            encryptionPublicKey: null,
            primaryWalletAddress: "",
            primaryChainId: 0,
            primaryChainLabel: ""
          }
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.id - b.id;
      })
      .slice(0, 10);

    return {
      ok: true,
      windowHours,
      hotMoments,
      hotGroups,
      recommendedUsers
    };
  }

  deleteMomentComment(userId: number, momentId: number, commentId: number) {
    this.store.deleteMomentComment(userId, momentId, commentId);
    return this.listMomentComments(userId, momentId);
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
