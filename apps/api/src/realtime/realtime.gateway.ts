import { Inject } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from "@nestjs/websockets";
import { parse } from "cookie";
import type { Socket, Server } from "socket.io";

import { AuthService } from "../auth/auth.service";
import { resolveAllowedWebOrigins } from "../common/web-origins";
import { MemoryStoreService } from "../store/memory-store.service";
import { RealtimeEventsService } from "./realtime-events.service";

@WebSocketGateway({
  cors: {
    origin: resolveAllowedWebOrigins(),
    credentials: true
  }
})
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  private readonly authService: AuthService;
  private readonly store: MemoryStoreService;
  private readonly realtimeEvents: RealtimeEventsService;

  constructor(
    @Inject(AuthService) authService: AuthService,
    @Inject(MemoryStoreService) store: MemoryStoreService,
    @Inject(RealtimeEventsService) realtimeEvents: RealtimeEventsService
  ) {
    this.authService = authService;
    this.store = store;
    this.realtimeEvents = realtimeEvents;
  }

  handleConnection(client: Socket) {
    this.realtimeEvents.setServer(this.server ?? client.nsp?.server);
    const cookies = parse(client.handshake.headers.cookie ?? "");
    const auth = this.authService.resolveUserBySession(
      cookies[this.authService.getSessionCookieName()] ?? null
    );
    if (!auth) {
      client.disconnect();
      return;
    }
    client.data.userId = auth.user.user.id;
    client.join(`user:${auth.user.user.id}`);
    client.emit("auth", auth.user);
  }

  @SubscribeMessage("subscribe:conversation")
  subscribeConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: number }
  ) {
    const userId = Number(client.data.userId);
    if (!this.store.getConversationMember(payload.conversationId, userId)) {
      return { ok: false };
    }
    client.join(`conversation:${payload.conversationId}`);
    return { ok: true };
  }

  @SubscribeMessage("unsubscribe:conversation")
  unsubscribeConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: number }
  ) {
    client.leave(`conversation:${payload.conversationId}`);
    return { ok: true };
  }
}
