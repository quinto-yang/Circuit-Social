import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { RealtimeEventsService } from "../realtime/realtime-events.service";
import type { NotificationKind, NotificationRealtimePayload } from "./notifications.types";

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RealtimeEventsService) private readonly realtime: RealtimeEventsService
  ) {}

  private get prismaEnabled() {
    return Boolean(process.env.DATABASE_URL);
  }

  private async createAndEmit(input: {
    userId: number;
    actorId: number;
    kind: NotificationKind;
    momentId?: number | null;
    commentId?: number | null;
    extra?: unknown;
  }) {
    if (!this.prismaEnabled) return null;
    if (input.userId === input.actorId) return null;

    const row = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        actorId: input.actorId,
        kind: input.kind,
        momentId: input.momentId ?? null,
        commentId: input.commentId ?? null,
        extra: input.extra ?? undefined
      },
      include: {
        actor: { select: { id: true, nickname: true, avatarUrl: true } }
      }
    });

    const payload: NotificationRealtimePayload = {
      id: row.id,
      kind: row.kind as NotificationKind,
      createdAt: row.createdAt.toISOString(),
      readAt: row.readAt ? row.readAt.toISOString() : null,
      actor: {
        id: row.actor.id,
        nickname: row.actor.nickname,
        avatarUrl: row.actor.avatarUrl ?? null
      },
      momentId: row.momentId ?? null,
      commentId: row.commentId ?? null
    };

    this.realtime.emitNotification(row.userId, payload);
    return row;
  }

  async notifyMomentLike(actorId: number, momentId: number) {
    if (!this.prismaEnabled) return;
    const moment = await this.prisma.moment.findUnique({
      where: { id: momentId },
      select: { authorId: true }
    });
    if (!moment) return;
    await this.createAndEmit({
      userId: moment.authorId,
      actorId,
      kind: "like",
      momentId
    });
  }

  async notifyMomentComment(actorId: number, momentId: number, commentId: number) {
    if (!this.prismaEnabled) return;
    const moment = await this.prisma.moment.findUnique({
      where: { id: momentId },
      select: { authorId: true }
    });
    if (!moment) return;
    await this.createAndEmit({
      userId: moment.authorId,
      actorId,
      kind: "comment",
      momentId,
      commentId
    });
  }

  async notifyReply(actorId: number, momentId: number, commentId: number, replyToUserId: number) {
    if (!this.prismaEnabled) return;
    await this.createAndEmit({
      userId: replyToUserId,
      actorId,
      kind: "reply",
      momentId,
      commentId
    });
  }
}

