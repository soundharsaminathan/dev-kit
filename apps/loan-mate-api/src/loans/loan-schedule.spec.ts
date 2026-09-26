import { describe, expect, it } from "vitest";
import { generateSchedule } from "../schedules/domain/emi";
import { projectedScheduleRows, scheduleRow } from "./loan-schedule";

describe("scheduleRow", () => {
  it("keeps remaining after a partial payment", () => {
    const row = scheduleRow({
      number: 1,
      dueDate: new Date(2026, 8, 26),
      principalDue: 800,
      interestDue: 200,
      penaltyDue: 10,
      paidPrincipal: 400,
      paidInterest: 0,
      paidPenalty: 0,
      status: "PARTIAL",
    });

    expect(row.dueDate).toBe("2026-09-26");
    expect(row.totalDue).toBe(1010);
    expect(row.paid).toBe(400);
    expect(row.remaining).toBe(610);
    expect(row.status).toBe("PARTIAL");
  });
});

describe("projectedScheduleRows", () => {
  it("marks every installment as not started", () => {
    const result = generateSchedule({
      principal: 12000,
      annualRatePercent: 18,
      tenureInstallments: 3,
      frequency: "MONTHLY",
      disbursementDate: new Date(2026, 0, 15),
    });
    const rows = projectedScheduleRows(result);

    expect(rows).toHaveLength(3);
    expect(rows.every((row) => row.status === "PROJECTED")).toBe(true);
    expect(rows.every((row) => row.paid === 0)).toBe(true);
    expect(rows[0]?.remaining).toBe(rows[0]?.totalDue);
  });
});
