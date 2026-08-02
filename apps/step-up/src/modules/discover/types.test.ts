import { describe, expect, it } from "vitest";
import { type DiscoverBatch, discoverCtaLabel } from "./types";

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
  it("shows Enrolled when the viewer is already enrolled", () => {
    expect(discoverCtaLabel(batch({ viewerEnrolled: true }))).toBe("Enrolled");
  });

  it("prefers Enrolled over Full", () => {
    expect(
      discoverCtaLabel(batch({ viewerEnrolled: true, remainingSeats: 0 })),
    ).toBe("Enrolled");
  });

  it("shows Enroll for open plan batches", () => {
    expect(discoverCtaLabel(batch())).toBe("Enroll");
  });

  it("shows Full when no seats remain", () => {
    expect(discoverCtaLabel(batch({ remainingSeats: 0 }))).toBe("Full");
  });
});
