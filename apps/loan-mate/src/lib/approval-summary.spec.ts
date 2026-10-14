import { describe, expect, it } from "vitest";
import { formatApprovalPayload } from "@/lib/approval-summary";

describe("formatApprovalPayload", () => {
  it("shows a dash when the checker has no payload", () => {
    expect(formatApprovalPayload(null)).toBe("—");
    expect(formatApprovalPayload(undefined)).toBe("—");
  });

  it("summarizes each approval the inbox can show", () => {
    expect(
      formatApprovalPayload({
        loanNumber: "LN-acme-000012",
        principal: 100000,
      }),
    ).toBe("LN-acme-000012 · principal 100000");

    expect(
      formatApprovalPayload({ oldRate: 18, newRate: 12 }),
    ).toBe("18% → 12%");

    expect(formatApprovalPayload({ newRate: 15 })).toBe("rate → 15%");

    expect(formatApprovalPayload({ penaltyDailyPercent: 0.05 })).toBe(
      "penalty 0.05%/day",
    );

    expect(formatApprovalPayload({ settlementAmount: 25000 })).toBe(
      "settlement 25000",
    );

    expect(
      formatApprovalPayload({
        amount: 500,
        newTenure: 8,
        paymentId: "pay-1",
        reason: "Goodwill",
      }),
    ).toBe("amount 500 · tenure 8 · payment pay-1 · Goodwill");
  });

  it("falls back to compact JSON for an unrecognized payload", () => {
    expect(formatApprovalPayload({ note: "manual" })).toBe('{"note":"manual"}');

    const text = formatApprovalPayload({ note: "x".repeat(120) });
    expect(text.endsWith("…")).toBe(true);
    expect(text.length).toBeLessThan(96);
  });
});
