export function formatPaidMonths(months: number) {
  return `${months} ${months === 1 ? "month" : "months"}`;
}
