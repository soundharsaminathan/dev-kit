import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationsGateway } from "./notifications.gateway";

describe("NotificationsGateway", () => {
  const firebase = {
    verifyToken: vi.fn(),
    resolveUser: vi.fn(),
  };

  const notifications = {
    unreadCount: vi.fn(),
    markAllRead: vi.fn(),
  };

  let gateway: NotificationsGateway;

  beforeEach(() => {
    vi.clearAllMocks();
    gateway = new NotificationsGateway(
      firebase as never,
      notifications as never,
    );
    gateway.server = {
      to: vi.fn(() => ({ emit: vi.fn() })),
    } as never;
  });

  it("disconnects sockets without a token", async () => {
    const socket = {
      handshake: { auth: {}, headers: {} },
      data: {},
      join: vi.fn(),
      emit: vi.fn(),
      disconnect: vi.fn(),
    };

    await gateway.handleConnection(socket as never);

    expect(socket.disconnect).toHaveBeenCalledWith(true);
    expect(firebase.verifyToken).not.toHaveBeenCalled();
  });

  it("authenticates, joins the user room, and emits the badge", async () => {
    firebase.verifyToken.mockResolvedValue({ uid: "firebase-1" });
    firebase.resolveUser.mockResolvedValue({ id: "user-1" });
    notifications.unreadCount.mockResolvedValue({ count: 4 });

    const socket = {
      handshake: {
        auth: { token: "token-1" },
        headers: {},
      },
      data: {} as { userId?: string },
      join: vi.fn(),
      emit: vi.fn(),
      disconnect: vi.fn(),
    };

    await gateway.handleConnection(socket as never);

    expect(firebase.verifyToken).toHaveBeenCalledWith("token-1");
    expect(socket.data.userId).toBe("user-1");
    expect(socket.join).toHaveBeenCalledWith("user:user-1");
    expect(socket.emit).toHaveBeenCalledWith("notifications.badge", {
      unreadCount: 4,
    });
    expect(socket.disconnect).not.toHaveBeenCalled();
  });

  it("accepts Bearer authorization header tokens", async () => {
    firebase.verifyToken.mockResolvedValue({ uid: "firebase-1" });
    firebase.resolveUser.mockResolvedValue({ id: "user-2" });
    notifications.unreadCount.mockResolvedValue({ count: 0 });

    const socket = {
      handshake: {
        auth: {},
        headers: { authorization: "Bearer header-token" },
      },
      data: {},
      join: vi.fn(),
      emit: vi.fn(),
      disconnect: vi.fn(),
    };

    await gateway.handleConnection(socket as never);

    expect(firebase.verifyToken).toHaveBeenCalledWith("header-token");
    expect(socket.join).toHaveBeenCalledWith("user:user-2");
  });

  it("disconnects when auth fails", async () => {
    firebase.verifyToken.mockRejectedValue(new Error("bad token"));

    const socket = {
      handshake: { auth: { token: "bad" }, headers: {} },
      data: {},
      join: vi.fn(),
      emit: vi.fn(),
      disconnect: vi.fn(),
    };

    await gateway.handleConnection(socket as never);

    expect(socket.disconnect).toHaveBeenCalledWith(true);
    expect(socket.join).not.toHaveBeenCalled();
  });

  it("marks all read for authenticated sockets", async () => {
    notifications.markAllRead.mockResolvedValue({ count: 2 });

    await expect(
      gateway.onReadAll({ data: { userId: "user-1" } } as never),
    ).resolves.toEqual({ count: 2 });
    expect(notifications.markAllRead).toHaveBeenCalledWith("user-1");
  });

  it("ignores read_all when the socket is unauthenticated", async () => {
    await expect(
      gateway.onReadAll({ data: {} } as never),
    ).resolves.toBeUndefined();
    expect(notifications.markAllRead).not.toHaveBeenCalled();
  });

  it("emits events to the user room", () => {
    const emit = vi.fn();
    gateway.server = {
      to: vi.fn(() => ({ emit })),
    } as never;

    gateway.emitToUser("user-1", "notification.created", { id: "n1" });

    expect(gateway.server.to).toHaveBeenCalledWith("user:user-1");
    expect(emit).toHaveBeenCalledWith("notification.created", { id: "n1" });
  });
});
