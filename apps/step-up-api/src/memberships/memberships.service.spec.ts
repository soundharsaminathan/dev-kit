import { NotificationType } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MembershipsService } from "./memberships.service";

describe("MembershipsService.renewManual", () => {
  const prisma = {
    membership: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  };

  const notifications = {
    create: vi.fn(),
  };

  let service: MembershipsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MembershipsService(prisma as never, notifications as never);
  });

  it("expires the old membership and creates a renewed one", async () => {
    prisma.membership.findUnique.mockResolvedValue({
      id: "mem-1",
      subscriptionId: "sub-1",
      purchaserUserId: "user-1",
      periodEnd: new Date(Date.UTC(2026, 5, 30, 23, 59, 59, 999)),
      subscription: {
        name: "Individual Kid Monthly",
        billingCadence: "MONTHLY",
      },
      coveredStudents: [{ studentId: "student-1", seatRole: "KID" }],
    });
    prisma.membership.create.mockResolvedValue({
      id: "mem-2",
      subscriptionId: "sub-1",
    });

    await service.renewManual("mem-1");

    expect(prisma.membership.update).toHaveBeenCalledWith({
      where: { id: "mem-1" },
      data: { status: "EXPIRED" },
    });
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        type: NotificationType.RENEWED,
        planName: "Individual Kid Monthly",
        meta: expect.objectContaining({
          membershipId: "mem-2",
          subscriptionId: "sub-1",
        }),
      }),
    );
  });
});
