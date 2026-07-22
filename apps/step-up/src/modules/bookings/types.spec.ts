import { describe, expect, it } from "vitest";
import { isBookingForTrainer, type StudioBooking } from "./types";

function booking(
  partial: Partial<StudioBooking> & Pick<StudioBooking, "id">,
): StudioBooking {
  return {
    type: "TRIAL",
    status: "PENDING",
    studentId: "student-1",
    ...partial,
  };
}

describe("isBookingForTrainer", () => {
  it("matches assigned trainerId", () => {
    expect(
      isBookingForTrainer(
        booking({ id: "1", trainerId: "trainer-a" }),
        "trainer-a",
      ),
    ).toBe(true);
  });

  it("matches trainer on the batch", () => {
    expect(
      isBookingForTrainer(
        booking({
          id: "2",
          batch: {
            id: "batch-1",
            name: "Hip Hop",
            trainers: [{ trainerId: "trainer-a" }],
          },
        }),
        "trainer-a",
      ),
    ).toBe(true);
  });

  it("rejects unrelated bookings", () => {
    expect(
      isBookingForTrainer(
        booking({
          id: "3",
          trainerId: "trainer-b",
          batch: {
            id: "batch-1",
            name: "Hip Hop",
            trainers: [{ trainerId: "trainer-b" }],
          },
        }),
        "trainer-a",
      ),
    ).toBe(false);
  });
});
