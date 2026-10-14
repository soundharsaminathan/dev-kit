import { describe, expect, it } from "vitest";
import { marketplacePersonalBadges } from "./viewer";

describe("marketplace viewer badges", () => {
  it("hides personal badges for guests", () => {
    expect(marketplacePersonalBadges({})).toEqual([]);
    expect(
      marketplacePersonalBadges({
        viewerEnrolled: null,
        viewerTrialBooked: null,
        viewerForChild: null,
      }),
    ).toEqual([]);
  });

  it("uses the locked enrolled, trial booked, and your child copy", () => {
    expect(
      marketplacePersonalBadges({
        viewerEnrolled: true,
        viewerTrialBooked: true,
        viewerForChild: true,
      }),
    ).toEqual([
      { id: "child", label: "Your child" },
      { id: "enrolled", label: "Enrolled" },
      { id: "trial", label: "Trial booked" },
    ]);
  });

  it("does not invent a badge when the viewer is not enrolled", () => {
    expect(
      marketplacePersonalBadges({
        viewerEnrolled: false,
        viewerTrialBooked: false,
        viewerForChild: false,
      }),
    ).toEqual([]);
  });
});
