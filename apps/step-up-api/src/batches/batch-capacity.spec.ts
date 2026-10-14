import { describe, expect, it } from "vitest";
import {
  countOccupiedSeats,
  PAYMENT_HOLD_MS,
  paymentHoldExpiresAt,
} from "./batch-capacity";

describe("batch-capacity", () => {
  it("payment hold lasts 10 minutes", () => {
    const from = new Date("2026-07-23T10:00:00.000Z");
    expect(paymentHoldExpiresAt(from).getTime() - from.getTime()).toBe(
      PAYMENT_HOLD_MS,
    );
    expect(PAYMENT_HOLD_MS).toBe(600_000);
  });

  it("counts unique students across enrollments and open bookings", async () => {
    const tx = {
      booking: {
        updateMany: async () => ({ count: 0 }),
        findMany: async () => [
          { studentId: "a" },
          { studentId: "b" },
          { studentId: "a" },
        ],
      },
      batchEnrollment: {
        findMany: async () => [{ studentId: "b" }, { studentId: "c" }],
        findFirst: async () => null,
      },
    };

    await expect(countOccupiedSeats(tx as never, "batch-1")).resolves.toBe(3);
  });

  it("rejects when adding students would exceed capacity", async () => {
    const { assertBatchHasSeats } = await import("./batch-capacity");
    const tx = {
      booking: {
        updateMany: async () => ({ count: 0 }),
        findMany: async () => [] as { studentId: string }[],
      },
      batchEnrollment: {
        findMany: async (args: {
          where?: { studentId?: { in?: string[] } };
        }) => {
          if (args.where?.studentId?.in) return [];
          return [{ studentId: "a" }, { studentId: "b" }];
        },
      },
    };

    await expect(
      assertBatchHasSeats(tx as never, "batch-1", 2, ["c"]),
    ).rejects.toThrow(/capacity/i);
  });

  it("allows bulk add when enough seats remain", async () => {
    const { assertBatchHasSeats } = await import("./batch-capacity");
    const tx = {
      booking: {
        updateMany: async () => ({ count: 0 }),
        findMany: async () => [] as { studentId: string }[],
      },
      batchEnrollment: {
        findMany: async (args: {
          where?: { studentId?: { in?: string[] } };
        }) => {
          if (args.where?.studentId?.in) return [];
          return [{ studentId: "a" }];
        },
      },
    };

    await expect(
      assertBatchHasSeats(tx as never, "batch-1", 3, ["b", "c"]),
    ).resolves.toBeUndefined();
  });
});
