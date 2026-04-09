import { Body, Controller, Get, Inject, Post, Query, Req, UseGuards } from "@nestjs/common";

import { SessionGuard } from "../auth/session.guard";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import type { NotificationKind } from "./notifications.types";

@Controller()
@UseGuards(SessionGuard)
export class NotificationsController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private get prismaEnabled() {
    return Boolean(process.env.DATABASE_URL);
  }

  @Get("notifications")
  async list(
    @Req() request: AuthenticatedRequest,
    @Query() query: { cursor?: string; limit?: string }
  ) {
    if (!this.prismaEnabled) {
      return { ok: true, items: [], nextCursor: null };
    }

    const limit = Math.min(50, Math.max(1, Number(query.limit ?? "20") || 20));
    const cursor = query.cursor ? Number(query.cursor) : null;

    const rows = await this.prisma.notification.findMany({
      where: { userId: request.authUserId },
      orderBy: [{ id: "desc" }],
      take: limit,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1
          }
        : {}),
      include: {
        actor: { select: { id: true, nickname: true, avatarUrl: true } },
        moment: { select: { id: true, content: true } },
        comment: { select: { id: true, content: true, momentId: true } }
      }
    });

    const items = rows.map((row) => {
      const momentId = row.momentId ?? row.comment?.momentId ?? null;
      const momentPreview = row.moment?.content ?? null;
      const commentPreview = row.comment?.content ?? null;
      return {
        id: row.id,
        kind: row.kind as NotificationKind,
        createdAt: row.createdAt.toISOString(),
        readAt: row.readAt ? row.readAt.toISOString() : null,
        actor: {
          id: row.actor.id,
          nickname: row.actor.nickname,
          avatarUrl: row.actor.avatarUrl ?? null
        },
        momentId,
        commentId: row.commentId ?? null,
        preview: {
          moment: momentPreview ? momentPreview.slice(0, 160) : null,
          comment: commentPreview ? commentPreview.slice(0, 160) : null
        }
      };
    });

    const nextCursor = items.length > 0 ? String(items[items.length - 1].id) : null;
    return { ok: true, items, nextCursor };
  }

  @Get("notifications/unread-count")
  async unreadCount(@Req() request: AuthenticatedRequest) {
    if (!this.prismaEnabled) {
      return { ok: true, count: 0 };
    }
    const count = await this.prisma.notification.count({
      where: { userId: request.authUserId, readAt: null }
    });
    return { ok: true, count };
  }

  @Post("notifications/mark-read")
  async markRead(
    @Req() request: AuthenticatedRequest,
    @Body() body: { ids?: number[]; all?: boolean }
  ) {
    if (!this.prismaEnabled) {
      return { ok: true, updated: 0 };
    }

    const now = new Date();
    if (body.all) {
      const result = await this.prisma.notification.updateMany({
        where: { userId: request.authUserId, readAt: null },
        data: { readAt: now }
      });
      return { ok: true, updated: result.count };
    }

    const ids = Array.isArray(body.ids) ? body.ids.filter((id) => Number.isFinite(id)) : [];
    if (!ids.length) return { ok: true, updated: 0 };
    const result = await this.prisma.notification.updateMany({
      where: { userId: request.authUserId, id: { in: ids }, readAt: null },
      data: { readAt: now }
    });
    return { ok: true, updated: result.count };
  }
}

