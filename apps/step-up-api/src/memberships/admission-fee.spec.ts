import { InvoiceChargeType, InvoiceStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  ADMISSION_FEE_KIND,
  buildAdmissionInvoiceData,
  isAdmissionPurchaseMeta,
  readAdmissionFeeAmount,
} from "./admission-fee";

describe("admission-fee helpers", () => {
  it("reads positive admission fee amounts", () => {
    expect(readAdmissionFeeAmount({ admissionFee: 1500 })).toBe(1500);
    expect(readAdmissionFeeAmount({ admissionFee: "999.5" })).toBe(999.5);
  });

  it("treats missing or non-positive fees as disabled", () => {
    expect(readAdmissionFeeAmount(null)).toBe(0);
    expect(readAdmissionFeeAmount({})).toBe(0);
    expect(readAdmissionFeeAmount({ admissionFee: 0 })).toBe(0);
    expect(readAdmissionFeeAmount({ admissionFee: -10 })).toBe(0);
  });

  it("builds an ADMISSION invoice without a membership", () => {
    const data = buildAdmissionInvoiceData({
      studentId: "stu-1",
      studioId: "studio-1",
      amount: 1000,
      batchId: "batch-1",
      enrolledAt: new Date("2026-01-15T12:00:00.000Z"),
      settings: { platformFeePercent: 5, gstPercent: 18 },
    });

    expect(data).toEqual(
      expect.objectContaining({
        studentId: "stu-1",
        studioId: "studio-1",
        amount: 1000,
        status: InvoiceStatus.PENDING,
        chargeType: InvoiceChargeType.ADMISSION,
        membershipId: null,
        platformFeePercent: 5,
        gstPercent: 18,
        purchaseMeta: {
          feeKind: ADMISSION_FEE_KIND,
          batchId: "batch-1",
          enrolledAt: "2026-01-15T12:00:00.000Z",
        },
      }),
    );
  });

  it("detects admission purchase meta", () => {
    expect(isAdmissionPurchaseMeta({ feeKind: "ADMISSION" })).toBe(true);
    expect(
      isAdmissionPurchaseMeta({
        subscriptionId: "sub-1",
        purchaserUserId: "u-1",
        coveredStudents: [],
      }),
    ).toBe(false);
  });
});
