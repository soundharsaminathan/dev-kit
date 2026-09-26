import { type EmiScheduleResult, round2 } from "../schedules/domain/emi";

export type ScheduleRowView = {
  number: number;
  dueDate: string;
  principalDue: number;
  interestDue: number;
  penaltyDue: number;
  totalDue: number;
  paid: number;
  remaining: number;
  status: string;
};

export function calendarDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function scheduleRow(input: {
  number: number;
  dueDate: Date;
  principalDue: number;
  interestDue: number;
  penaltyDue: number;
  paidPrincipal: number;
  paidInterest: number;
  paidPenalty: number;
  status: string;
}): ScheduleRowView {
  const totalDue = round2(
    input.principalDue + input.interestDue + input.penaltyDue,
  );
  const paid = round2(
    input.paidPrincipal + input.paidInterest + input.paidPenalty,
  );
  return {
    number: input.number,
    dueDate: calendarDate(input.dueDate),
    principalDue: input.principalDue,
    interestDue: input.interestDue,
    penaltyDue: input.penaltyDue,
    totalDue,
    paid,
    remaining: round2(Math.max(0, totalDue - paid)),
    status: input.status,
  };
}

export function projectedScheduleRows(
  result: EmiScheduleResult,
): ScheduleRowView[] {
  return result.schedule.map((row) =>
    scheduleRow({
      number: row.installmentNumber,
      dueDate: row.dueDate,
      principalDue: row.principalDue,
      interestDue: row.interestDue,
      penaltyDue: 0,
      paidPrincipal: 0,
      paidInterest: 0,
      paidPenalty: 0,
      status: "PROJECTED",
    }),
  );
}
