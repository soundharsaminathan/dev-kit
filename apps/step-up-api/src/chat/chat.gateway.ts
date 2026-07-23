import { Inject, Logger, UseFilters } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import { FirebaseService } from "../auth/firebase.service";
import { PrismaService } from "../prisma/prisma.service";
import { sentryExceptionFilters } from "../sentry-nest";

interface SocketData {
  userId?: string;
}

@UseFilters(...sentryExceptionFilters())
@WebSocketGateway({
  namespace: "/chat",
  cors: { origin: true, credentials: true },
})
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    @Inject(FirebaseService) private readonly firebase: FirebaseService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async handleConnection(socket: Socket) {
    try {
      const token =
        (socket.handshake.auth?.token as string | undefined) ??
        socket.handshake.headers.authorization?.replace(/^Bearer /, "");
      if (!token) {
        socket.disconnect(true);
        return;
      }

      const auth = await this.firebase.verifyToken(token);
      const user = await this.firebase.resolveUser(auth);
      (socket.data as SocketData).userId = user.id;

      await socket.join(`user:${user.id}`);
      const memberships = await this.prisma.conversationMember.findMany({
        where: { userId: user.id },
        select: { conversationId: true },
      });
      await socket.join(
        memberships.map((m) => `conversation:${m.conversationId}`),
      );
    } catch (error) {
      this.logger.warn(`Socket auth failed: ${String(error)}`);
      socket.disconnect(true);
    }
  }

  @SubscribeMessage("conversation.join")
  async onJoinConversation(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { conversationId: string },
  ) {
    const userId = (socket.data as SocketData).userId;
    if (!userId || !body?.conversationId) {
      return;
    }
    const member = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: body.conversationId,
          userId,
        },
      },
    });
    if (member) {
      await socket.join(`conversation:${body.conversationId}`);
    }
  }

  @SubscribeMessage("typing.start")
  onTypingStart(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { conversationId: string },
  ) {
    this.broadcastTyping(socket, body, true);
  }

  @SubscribeMessage("typing.stop")
  onTypingStop(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { conversationId: string },
  ) {
    this.broadcastTyping(socket, body, false);
  }

  private broadcastTyping(
    socket: Socket,
    body: { conversationId: string },
    typing: boolean,
  ) {
    const userId = (socket.data as SocketData).userId;
    if (!userId || !body?.conversationId) {
      return;
    }
    if (!socket.rooms.has(`conversation:${body.conversationId}`)) {
      return;
    }
    socket.to(`conversation:${body.conversationId}`).emit("typing", {
      conversationId: body.conversationId,
      userId,
      typing,
    });
  }

  emitToConversation(conversationId: string, event: string, payload: unknown) {
    this.server?.to(`conversation:${conversationId}`).emit(event, payload);
  }

  emitToUsers(userIds: string[], event: string, payload: unknown) {
    for (const userId of userIds) {
      this.server?.to(`user:${userId}`).emit(event, payload);
    }
  }

  joinUsersToConversation(userIds: string[], conversationId: string) {
    for (const userId of userIds) {
      this.server
        ?.in(`user:${userId}`)
        .socketsJoin(`conversation:${conversationId}`);
    }
  }

  removeUserFromConversation(userId: string, conversationId: string) {
    this.server
      ?.in(`user:${userId}`)
      .socketsLeave(`conversation:${conversationId}`);
  }
}
