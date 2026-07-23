import { expect, type Mock, vi } from "vitest";

type NotificationsMock = {
  create: Mock<(...args: unknown[]) => Promise<{ id: string }>>;
};

export function createNotificationsMock(): NotificationsMock {
  return {
    create: vi.fn().mockResolvedValue({ id: "notif-1" }),
  };
}

export function expectNotification(
  notifications: NotificationsMock,
  expected: Record<string, unknown>,
) {
  expect(notifications.create).toHaveBeenCalledWith(
    expect.objectContaining(expected),
  );
}
