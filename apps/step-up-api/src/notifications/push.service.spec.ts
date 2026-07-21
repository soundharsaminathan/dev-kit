import { beforeEach, describe, expect, it, vi } from "vitest";
import { PushService } from "./push.service";

const sendEachForMulticast = vi.fn();

vi.mock("firebase-admin", () => ({
  apps: [{ name: "test" }],
  initializeApp: vi.fn(),
  messaging: () => ({
    sendEachForMulticast,
  }),
}));

describe("PushService", () => {
  const prisma = {
    pushDevice: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
  };

  const config = {
    get: vi.fn((key: string) => {
      if (key === "FIREBASE_PROJECT_ID") return "step-up10";
      if (key === "FIREBASE_CLIENT_EMAIL") return "test@example.com";
      if (key === "FIREBASE_PRIVATE_KEY") return "private-key";
      return undefined;
    }),
  };

  let service: PushService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PushService(config as never, prisma as never);
  });

  it("registers a device token for a user", async () => {
    prisma.pushDevice.upsert.mockResolvedValue({ id: "device-1" });

    await service.registerToken("user-1", "fcm-token-1");

    expect(prisma.pushDevice.upsert).toHaveBeenCalledWith({
      where: { token: "fcm-token-1" },
      create: { userId: "user-1", token: "fcm-token-1" },
      update: { userId: "user-1" },
    });
  });

  it("sends a multicast push to registered devices", async () => {
    prisma.pushDevice.findMany.mockResolvedValue([
      { token: "fcm-token-1" },
      { token: "fcm-token-2" },
    ]);
    sendEachForMulticast.mockResolvedValue({
      responses: [{ success: true }, { success: true }],
    });

    await service.sendToUser("user-1", {
      title: "Plan renewed",
      body: "Your plan is active.",
      data: { notificationId: "notif-1", type: "RENEWED" },
    });

    expect(sendEachForMulticast).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: ["fcm-token-1", "fcm-token-2"],
        notification: {
          title: "Plan renewed",
          body: "Your plan is active.",
        },
      }),
    );
  });

  it("removes invalid registration tokens", async () => {
    prisma.pushDevice.findMany.mockResolvedValue([{ token: "stale-token" }]);
    sendEachForMulticast.mockResolvedValue({
      responses: [
        {
          success: false,
          error: { code: "messaging/registration-token-not-registered" },
        },
      ],
    });
    prisma.pushDevice.delete.mockResolvedValue({ id: "device-1" });

    await service.sendToUser("user-1", {
      title: "Missed session",
      body: "You were marked absent.",
    });

    expect(prisma.pushDevice.delete).toHaveBeenCalledWith({
      where: { token: "stale-token" },
    });
  });
});
