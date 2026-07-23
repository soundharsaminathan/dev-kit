import { forwardRef, Inject, Logger, UseFilters } from "@nestjs/common";
import {
  ConnectedSocket,
  type OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import { FirebaseService } from "../auth/firebase.service";
import { sentryExceptionFilters } from "../sentry-nest";
import { NotificationsService } from "./notifications.service";

interface SocketData {
  userId?: string;
}

@UseFilters(...sentryExceptionFilters())
@WebSocketGateway({
  namespace: "/notifications",
  cors: { origin: true, credentials: true },
})
export class NotificationsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    @Inject(FirebaseService) private readonly firebase: FirebaseService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notifications: NotificationsService,
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

      const badge = await this.notifications.unreadCount(user.id);
      socket.emit("notifications.badge", { unreadCount: badge.count });
    } catch (error) {
      this.logger.warn(`Notifications socket auth failed: ${String(error)}`);
      socket.disconnect(true);
    }
  }

  @SubscribeMessage("notifications.read_all")
  async onReadAll(@ConnectedSocket() socket: Socket) {
    const userId = (socket.data as SocketData).userId;
    if (!userId) {
      return;
    }
    return this.notifications.markAllRead(userId);
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.server?.to(`user:${userId}`).emit(event, payload);
  }
}
