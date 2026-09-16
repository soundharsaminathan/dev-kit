export function formatApprovalPayload(
  payload?: Record<string, unknown> | null,
): string {
  if (!payload || typeof payload !== "object") return "—";
  const parts: string[] = [];
  if (payload.loanNumber) parts.push(String(payload.loanNumber));
  if (payload.principal != null) parts.push(`principal ${payload.principal}`);
  if (payload.oldRate != null && payload.newRate != null) {
    parts.push(`${payload.oldRate}% → ${payload.newRate}%`);
  } else if (payload.newRate != null) {
    parts.push(`rate → ${payload.newRate}%`);
  }
  if (payload.penaltyDailyPercent != null) {
    parts.push(`penalty ${payload.penaltyDailyPercent}%/day`);
  }
  if (payload.settlementAmount != null) {
    parts.push(`settlement ${payload.settlementAmount}`);
  }
  if (payload.amount != null) parts.push(`amount ${payload.amount}`);
  if (payload.newTenure != null) parts.push(`tenure ${payload.newTenure}`);
  if (payload.paymentId) parts.push(`payment ${payload.paymentId}`);
  if (payload.reason) parts.push(String(payload.reason));
  if (parts.length) return parts.join(" · ");
  const raw = JSON.stringify(payload);
  return raw.length > 96 ? `${raw.slice(0, 93)}…` : raw;
}
