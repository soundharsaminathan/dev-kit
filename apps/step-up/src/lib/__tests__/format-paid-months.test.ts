import { describe, expect, it } from "vitest";
import { formatPaidMonths } from "../format-paid-months";

describe("formatPaidMonths", () => {
  it("formats zero and plural months", () => {
    expect(formatPaidMonths(0)).toBe("0 months");
    expect(formatPaidMonths(3)).toBe("3 months");
  });

  it("formats a single month", () => {
    expect(formatPaidMonths(1)).toBe("1 month");
  });
});
