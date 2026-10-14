import { describe, expect, it } from "vitest";
import {
  childAudienceBlocked,
  visibleMarketplaceBookTypes,
} from "./book";

describe("marketplace book helpers", () => {
  it("blocks child × audience mismatches", () => {
    expect(
      childAudienceBlocked({ forChild: true, classAudience: "ADULTS" }),
    ).toBe("This class is for adults only");
    expect(
      childAudienceBlocked({ forChild: false, classAudience: "KIDS" }),
    ).toBe("This class is for kids. Book with a child profile.");
  });

  it("hides floor hire on home studio cards", () => {
    expect(
      visibleMarketplaceBookTypes({
        canTrial: true,
        canEnroll: false,
        canPrivate: true,
        canFloorHire: true,
        source: "studio",
      }),
    ).toEqual(["TRIAL", "PRIVATE"]);
    expect(
      visibleMarketplaceBookTypes({
        canTrial: true,
        canEnroll: false,
        canPrivate: true,
        canFloorHire: true,
        source: "studio-detail",
      }),
    ).toEqual(["TRIAL", "PRIVATE", "FLOOR_HIRE"]);
  });
});
