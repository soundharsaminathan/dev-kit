import { describe, expect, it } from "vitest";
import { allocateFamilyDiscount } from "./invoice-types";

describe("allocateFamilyDiscount", () => {
  it("splits proportionally and puts remainder on the last invoice", () => {
    expect(allocateFamilyDiscount([1000, 2000], 100)).toEqual([33.33, 66.67]);
    expect(allocateFamilyDiscount([1000, 1000], 100)).toEqual([50, 50]);
  });

  it("rejects discount above the subtotal", () => {
    expect(() => allocateFamilyDiscount([500, 500], 1001)).toThrow(
      /invalid family discount/i,
    );
  });

  it("rejects negative discount", () => {
    expect(() => allocateFamilyDiscount([500, 500], -1)).toThrow(
      /invalid family discount/i,
    );
  });
});
