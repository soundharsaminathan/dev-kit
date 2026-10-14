/** Pure gates for LMS behaviors added on top of the existing loan path. */

export function chequeRejection(
  mode: string,
  bankName?: string | null,
  chequeDate?: string | null,
): string | null {
  if (mode !== "CHEQUE") return null;
  if (!bankName?.trim()) return "Cheque requires a bank name";
  if (!chequeDate) return "Cheque requires a cheque date";
  return null;
}

export function approvalApplies(
  level: number,
  requiredLevels: number,
): boolean {
  const required = Math.max(1, requiredLevels);
  return level >= required;
}

export function feeWaiverRejection(
  amount: number,
  chargesOutstanding: number,
): string | null {
  if (chargesOutstanding <= 0) return "No charges left to waive";
  if (amount <= 0) return "Waiver amount must be positive";
  if (amount > chargesOutstanding + 0.001) {
    return "Waiver exceeds outstanding charges";
  }
  return null;
}

export function kycDecisionRejection(
  status: "VERIFIED" | "REJECTED",
  reason?: string | null,
): string | null {
  if (status === "REJECTED" && !reason?.trim()) {
    return "Rejection reason required";
  }
  return null;
}

export function trancheRejection(
  released: number,
  nextAmount: number,
  principal: number,
): string | null {
  if (nextAmount <= 0) return "Tranche amount must be positive";
  if (released + nextAmount > principal + 0.001) {
    return "Tranches exceed sanctioned principal";
  }
  return null;
}

export function documentReviewRejection(
  actorId: string,
  uploadedById: string | null | undefined,
): string | null {
  if (uploadedById && actorId === uploadedById) {
    return "Uploader cannot review their own document";
  }
  return null;
}

export function creditScoreRejection(score: number | undefined): string | null {
  if (score == null) return null;
  if (!Number.isInteger(score) || score < 300 || score > 900) {
    return "Credit score must be between 300 and 900";
  }
  return null;
}
