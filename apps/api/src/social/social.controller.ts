import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";

import { SessionGuard } from "../auth/session.guard";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { DidResolverService } from "../did/did-resolver.service";
import { SocialService } from "./social.service";

@Controller()
@UseGuards(SessionGuard)
export class SocialController {
  constructor(
    @Inject(SocialService) private readonly socialService: SocialService,
    @Inject(DidResolverService) private readonly didResolverService: DidResolverService
  ) {
    this.friends = this.friends.bind(this);
    this.friendRequests = this.friendRequests.bind(this);
    this.createFriendRequest = this.createFriendRequest.bind(this);
    this.respondFriendRequest = this.respondFriendRequest.bind(this);
    this.conversations = this.conversations.bind(this);
    this.startDm = this.startDm.bind(this);
    this.createGroup = this.createGroup.bind(this);
    this.joinGroup = this.joinGroup.bind(this);
    this.group = this.group.bind(this);
    this.groupMembers = this.groupMembers.bind(this);
    this.kickMember = this.kickMember.bind(this);
    this.muteMember = this.muteMember.bind(this);
    this.leaveGroup = this.leaveGroup.bind(this);
    this.messages = this.messages.bind(this);
    this.conversationParticipants = this.conversationParticipants.bind(this);
    this.sendMessage = this.sendMessage.bind(this);
    this.markRead = this.markRead.bind(this);
    this.moments = this.moments.bind(this);
    this.createMoment = this.createMoment.bind(this);
    this.uploadImage = this.uploadImage.bind(this);
    this.report = this.report.bind(this);
    this.updateProfile = this.updateProfile.bind(this);
  }

  @Get("friends")
  friends(@Req() request: AuthenticatedRequest) {
    return {
      ok: true,
      ...this.socialService.listFriends(request.authUserId)
    };
  }

  @Get("friend-requests")
  friendRequests(@Req() request: AuthenticatedRequest) {
    return {
      ok: true,
      ...this.socialService.listFriendRequests(request.authUserId)
    };
  }

  @Post("friend-requests")
  createFriendRequest(
    @Req() request: AuthenticatedRequest,
    @Body() body: { target: string }
  ) {
    return {
      ok: true,
      ...this.socialService.createFriendRequest(request.authUserId, body.target)
    };
  }

  @Post("friend-requests/:requestId/respond")
  respondFriendRequest(
    @Req() request: AuthenticatedRequest,
    @Param("requestId", ParseIntPipe) requestId: number,
    @Body() body: { action: "accept" | "decline" }
  ) {
    return {
      ok: true,
      ...this.socialService.respondFriendRequest(
        request.authUserId,
        requestId,
        body.action
      )
    };
  }

  @Get("conversations")
  conversations(@Req() request: AuthenticatedRequest) {
    return {
      ok: true,
      ...this.socialService.listConversations(request.authUserId)
    };
  }

  @Post("conversations/dm")
  startDm(
    @Req() request: AuthenticatedRequest,
    @Body() body: { peerId: number }
  ) {
    return {
      ok: true,
      ...this.socialService.startDirectConversation(
        request.authUserId,
        Number(body.peerId)
      )
    };
  }

  @Post("groups")
  createGroup(
    @Req() request: AuthenticatedRequest,
    @Body() body: { name: string }
  ) {
    return {
      ok: true,
      ...this.socialService.createGroup(request.authUserId, body.name)
    };
  }

  @Post("groups/join")
  joinGroup(
    @Req() request: AuthenticatedRequest,
    @Body() body: { inviteCode: string }
  ) {
    return {
      ok: true,
      ...this.socialService.joinGroup(request.authUserId, body.inviteCode)
    };
  }

  @Get("groups/:groupId")
  group(
    @Req() request: AuthenticatedRequest,
    @Param("groupId", ParseIntPipe) groupId: number
  ) {
    return {
      ok: true,
      ...this.socialService.getGroup(request.authUserId, groupId)
    };
  }

  @Get("groups/:groupId/members")
  groupMembers(
    @Req() request: AuthenticatedRequest,
    @Param("groupId", ParseIntPipe) groupId: number
  ) {
    return {
      ok: true,
      ...this.socialService.getGroupMembers(request.authUserId, groupId)
    };
  }

  @Post("groups/:groupId/kick")
  kickMember(
    @Req() request: AuthenticatedRequest,
    @Param("groupId", ParseIntPipe) groupId: number,
    @Body() body: { userId: number }
  ) {
    return {
      ok: true,
      ...this.socialService.kickGroupMember(
        request.authUserId,
        groupId,
        Number(body.userId)
      )
    };
  }

  @Post("groups/:groupId/mute")
  muteMember(
    @Req() request: AuthenticatedRequest,
    @Param("groupId", ParseIntPipe) groupId: number,
    @Body() body: { userId: number; minutes: number }
  ) {
    return {
      ok: true,
      ...this.socialService.muteGroupMember(
        request.authUserId,
        groupId,
        Number(body.userId),
        Number(body.minutes)
      )
    };
  }

  @Post("groups/:groupId/leave")
  leaveGroup(
    @Req() request: AuthenticatedRequest,
    @Param("groupId", ParseIntPipe) groupId: number
  ) {
    return {
      ok: true,
      ...this.socialService.leaveGroup(request.authUserId, groupId)
    };
  }

  @Get("messages")
  messages(
    @Req() request: AuthenticatedRequest,
    @Query("conversation_id") conversationId: string,
    @Query("before_id") beforeId?: string,
    @Query("after_id") afterId?: string
  ) {
    return {
      ok: true,
      ...this.socialService.listMessages(request.authUserId, {
        conversationId: Number(conversationId),
        beforeId: beforeId ? Number(beforeId) : undefined,
        afterId: afterId ? Number(afterId) : undefined
      })
    };
  }

  @Get("conversations/:conversationId/participants")
  conversationParticipants(
    @Req() request: AuthenticatedRequest,
    @Param("conversationId", ParseIntPipe) conversationId: number
  ) {
    return {
      ok: true,
      ...this.socialService.listConversationParticipants(request.authUserId, conversationId)
    };
  }

  @Post("messages")
  sendMessage(
    @Req() request: AuthenticatedRequest,
    @Body()
    body: {
      conversationId: number;
      content: string;
      mentionUserIds?: number[];
    }
  ) {
    return {
      ok: true,
      ...this.socialService.sendMessage(request.authUserId, {
        conversationId: Number(body.conversationId),
        content: body.content,
        mentionUserIds: body.mentionUserIds ?? []
      })
    };
  }

  @Post("messages/read")
  markRead(
    @Req() request: AuthenticatedRequest,
    @Body() body: { conversationId: number; messageId: number | null }
  ) {
    return this.socialService.markRead(
      request.authUserId,
      Number(body.conversationId),
      body.messageId ? Number(body.messageId) : null
    );
  }

  @Get("moments")
  moments(
    @Req() request: AuthenticatedRequest,
    @Query("before_id") beforeId?: string
  ) {
    return {
      ok: true,
      ...this.socialService.listMoments(
        request.authUserId,
        beforeId ? Number(beforeId) : undefined
      )
    };
  }

  @Post("moments")
  createMoment(
    @Req() request: AuthenticatedRequest,
    @Body() body: { content: string; uploadIds: number[] }
  ) {
    return {
      ok: true,
      ...this.socialService.createMoment(request.authUserId, {
        content: body.content,
        uploadIds: body.uploadIds ?? []
      })
    };
  }

  @Post("uploads/image")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024
      }
    })
  )
  async uploadImage(
    @Req() request: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File
  ) {
    return {
      ok: true,
      ...(await this.socialService.uploadImage(request.authUserId, file))
    };
  }

  @Post("reports")
  report(
    @Req() request: AuthenticatedRequest,
    @Body() body: { kind: "moment" | "message"; targetId: number; reason: string }
  ) {
    return {
      ok: true,
      ...this.socialService.createReport(request.authUserId, {
        kind: body.kind,
        targetId: Number(body.targetId),
        reason: body.reason
      })
    };
  }

  @Post("profile")
  updateProfile(
    @Req() request: AuthenticatedRequest,
    @Body()
    body: {
      nickname?: string;
      bio?: string;
      avatarUrl?: string | null;
      didUri?: string | null;
      primaryWalletId?: number;
      encryptionPublicKey?: string | null;
    }
  ) {
    const user = this.socialService.updateProfile(request.authUserId, body);
    return {
      ok: true,
      user,
      didStatus: this.didResolverService.getStatus(user.didUri)
    };
  }
}
