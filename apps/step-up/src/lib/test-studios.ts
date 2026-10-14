/** Same flag as `direct` — opt into seeded test studios on public auth pages. */
export function isIncludeTestFlag(value: unknown): boolean {
  return value === true || value === "true" || value === "1" || value === 1;
}
