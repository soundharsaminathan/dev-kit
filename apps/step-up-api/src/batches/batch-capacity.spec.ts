import { describe, expect, it } from "vitest";
import {
  countOccupiedSeats,
  PAYMENT_HOLD_MS,
  paymentHoldExpiresAt,
} from "./batch-capacity";

describe("batch-capacity", () => {
  it("payment hold lasts 30 seconds", () => {
    const from = new Date("2026-07-23T10:00:00.000Z");
    expect(paymentHoldExpiresAt(from).getTime() - from.getTime()).toBe(
      PAYMENT_HOLD_MS,
    );
    expect(PAYMENT_HOLD_MS).toBe(30_000);
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
});
