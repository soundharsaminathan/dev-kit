/** Coerce Prisma Decimal / string / number to JS number. */
export function toNumber(value: { toNumber(): number } | number | string): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return value.toNumber();
}

/** Format as money string for Prisma Decimal fields. */
export function money(value: number | string): string {
  const n = typeof value === "number" ? value : Number(value);
  return n.toFixed(2);
}
