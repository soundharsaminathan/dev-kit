export type PayMethod = "upi" | "card" | "netbanking";

export function secondsLeft(expiresAt: string | null | undefined) {
  if (!expiresAt) return 0;
  return Math.max(
    0,
    Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000),
  );
}

export function formatSeconds(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
