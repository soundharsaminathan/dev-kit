import { describe, expect, it } from "vitest";
import {
  type DiscoverBatch,
  discoverCtaLabel,
  isDiscoverCtaMuted,
} from "./types";

function batch(overrides: Partial<DiscoverBatch> = {}): DiscoverBatch {
  return {
    id: "b1",
    name: "Hip Hop",
    enrollmentMode: "SELF_JOIN",
    category: "ADULTS",
    capacity: 20,
    remainingSeats: 5,
    active: true,
    trainers: [],
    plans: [
      {
        id: "p1",
        name: "Monthly",
        kind: "INDIVIDUAL",
        billingCadence: "MONTHLY",
        adultSeats: 1,
        kidSeats: 0,
        price: 2000,
        active: true,
      },
    ],
    ...overrides,
  };
}

describe("discoverCtaLabel", () => {
  it("shows Enrolled when the viewer is enrolled", () => {
    expect(
      discoverCtaLabel(
        batch({
          viewerEnrolled: true,
          viewerEnrollment: { enrolledAt: "2026-01-01T00:00:00.000Z" },
        }),
      ),
    ).toBe("Enrolled");
  });

  it("prefers enrollment status over Full", () => {
    expect(
      discoverCtaLabel(
        batch({
          viewerEnrolled: true,
          viewerEnrollment: { enrolledAt: "2026-01-01T00:00:00.000Z" },
          remainingSeats: 0,
        }),
      ),
    ).toBe("Enrolled");
  });

  it("shows Trial requested for a pending trial booking", () => {
    expect(
      discoverCtaLabel(
        batch({
          viewerBooking: {
            id: "bk1",
            type: "TRIAL",
            status: "PENDING",
          },
        }),
      ),
    ).toBe("Trial requested");
  });

  it("shows Trial approved for a confirmed trial booking", () => {
    expect(
      discoverCtaLabel(
        batch({
          viewerBooking: {
            id: "bk1",
            type: "TRIAL",
            status: "CONFIRMED",
          },
        }),
      ),
    ).toBe("Trial approved");
  });

  it("shows Request pending for non-trial pending bookings", () => {
    expect(
      discoverCtaLabel(
        batch({
          viewerBooking: {
            id: "bk1",
            type: "OPEN_SEAT",
            status: "PENDING",
          },
        }),
      ),
    ).toBe("Request pending");
  });

  it("shows Booking confirmed for non-trial confirmed bookings", () => {
    expect(
      discoverCtaLabel(
        batch({
          viewerBooking: {
            id: "bk1",
            type: "PRIVATE",
            status: "CONFIRMED",
          },
        }),
      ),
    ).toBe("Booking confirmed");
  });

  it("shows Pay now when checkout is still open", () => {
    expect(
      discoverCtaLabel(
        batch({
          viewerBooking: {
            id: "bk1",
            type: "OPEN_SEAT",
            status: "AWAITING_PAYMENT",
          },
        }),
      ),
    ).toBe("Pay now");
  });

  it("shows Enroll for open plan batches", () => {
    expect(discoverCtaLabel(batch())).toBe("Enroll");
  });

  it("shows Full when no seats remain", () => {
    expect(discoverCtaLabel(batch({ remainingSeats: 0 }))).toBe("Full");
  });
});

describe("isDiscoverCtaMuted", () => {
  it("mutes status labels and keeps action labels vivid", () => {
    expect(isDiscoverCtaMuted("Enrolled")).toBe(true);
    expect(isDiscoverCtaMuted("Trial requested")).toBe(true);
    expect(isDiscoverCtaMuted("Trial approved")).toBe(true);
    expect(isDiscoverCtaMuted("Pay now")).toBe(false);
    expect(isDiscoverCtaMuted("Enroll")).toBe(false);
  });
});
