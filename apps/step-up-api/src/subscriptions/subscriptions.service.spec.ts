import { ConflictException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SubscriptionsService } from "./subscriptions.service";

describe("SubscriptionsService.remove", () => {
  const prisma = {
    subscription: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  };

  let service: SubscriptionsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SubscriptionsService(prisma as never);
  });

  it("deletes an unused plan", async () => {
    prisma.subscription.findUnique.mockResolvedValue({
      id: "sub-1",
      _count: { memberships: 0, batchPlans: 0 },
    });
    prisma.subscription.delete.mockResolvedValue({ id: "sub-1" });

    await expect(service.remove("sub-1")).resolves.toEqual({ id: "sub-1" });
    expect(prisma.subscription.delete).toHaveBeenCalledWith({
      where: { id: "sub-1" },
    });
  });

  it("rejects delete when the plan has memberships", async () => {
    prisma.subscription.findUnique.mockResolvedValue({
      id: "sub-1",
      _count: { memberships: 2, batchPlans: 0 },
    });

    await expect(service.remove("sub-1")).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.subscription.delete).not.toHaveBeenCalled();
  });

  it("rejects delete when the plan is attached to batches", async () => {
    prisma.subscription.findUnique.mockResolvedValue({
      id: "sub-1",
      _count: { memberships: 0, batchPlans: 1 },
    });

    await expect(service.remove("sub-1")).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.subscription.delete).not.toHaveBeenCalled();
  });

  it("rejects delete when the plan is missing", async () => {
    prisma.subscription.findUnique.mockResolvedValue(null);

    await expect(service.remove("missing")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.subscription.delete).not.toHaveBeenCalled();
  });
});

describe("SubscriptionsService.getById", () => {
  const prisma = {
    subscription: {
      findUnique: vi.fn(),
    },
  };

  let service: SubscriptionsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SubscriptionsService(prisma as never);
  });

  it("returns usage flags for unused plans", async () => {
    prisma.subscription.findUnique.mockResolvedValue({
      id: "sub-1",
      name: "Adult monthly",
      _count: { memberships: 0, batchPlans: 0 },
    });

    await expect(service.getById("sub-1")).resolves.toEqual({
      id: "sub-1",
      name: "Adult monthly",
      membershipCount: 0,
      batchPlanCount: 0,
      canDelete: true,
    });
  });

  it("marks plans with memberships as not deletable", async () => {
    prisma.subscription.findUnique.mockResolvedValue({
      id: "sub-1",
      name: "Adult monthly",
      _count: { memberships: 1, batchPlans: 0 },
    });

    await expect(service.getById("sub-1")).resolves.toMatchObject({
      canDelete: false,
      membershipCount: 1,
      batchPlanCount: 0,
    });
  });
});
