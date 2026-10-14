import { round2 } from "./emi";

export interface AllocatableInstallment {
  id: string;
  principalDue: number;
  interestDue: number;
  penaltyDue: number;
  paidPrincipal: number;
  paidInterest: number;
  paidPenalty: number;
  dueDate: Date;
}

export interface AllocationLine {
  installmentId: string;
  penalty: number;
  interest: number;
  principal: number;
}

export interface AllocationResult {
  lines: AllocationLine[];
  allocated: number;
  remaining: number;
}

function remainingOf(inst: AllocatableInstallment) {
  return {
    penalty: round2(Math.max(0, inst.penaltyDue - inst.paidPenalty)),
    interest: round2(Math.max(0, inst.interestDue - inst.paidInterest)),
    principal: round2(Math.max(0, inst.principalDue - inst.paidPrincipal)),
  };
}

/**
 * Allocate payment: Penalty → Interest → Principal, oldest due date first.
 * Rejects overpayment (caller should check total outstanding first).
 */
export function allocatePayment(
  amount: number,
  installments: AllocatableInstallment[],
): AllocationResult {
  if (amount <= 0) {
    throw new Error("Payment amount must be positive");
  }

  const sorted = [...installments].sort(
    (a, b) => a.dueDate.getTime() - b.dueDate.getTime(),
  );

  let left = round2(amount);
  const lines: AllocationLine[] = [];

  for (const inst of sorted) {
    if (left <= 0) break;
    const rem = remainingOf(inst);
    const totalRem = round2(rem.penalty + rem.interest + rem.principal);
    if (totalRem <= 0) continue;

    let penalty = 0;
    let interest = 0;
    let principal = 0;

    const takePenalty = Math.min(left, rem.penalty);
    penalty = takePenalty;
    left = round2(left - takePenalty);

    const takeInterest = Math.min(left, rem.interest);
    interest = takeInterest;
    left = round2(left - takeInterest);

    const takePrincipal = Math.min(left, rem.principal);
    principal = takePrincipal;
    left = round2(left - takePrincipal);

    if (penalty + interest + principal > 0) {
      lines.push({
        installmentId: inst.id,
        penalty: round2(penalty),
        interest: round2(interest),
        principal: round2(principal),
      });
    }
  }

  return {
    lines,
    allocated: round2(amount - left),
    remaining: left,
  };
}

export function installmentOutstanding(inst: AllocatableInstallment): number {
  const rem = remainingOf(inst);
  return round2(rem.penalty + rem.interest + rem.principal);
}

export function totalOutstanding(installments: AllocatableInstallment[]): number {
  return round2(installments.reduce((s, i) => s + installmentOutstanding(i), 0));
}
