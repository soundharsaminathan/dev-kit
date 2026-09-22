export function formatPriceFrom(
  price: number | null,
  cadence: "MONTHLY" | "QUARTERLY" | null,
): string | null {
  if (price == null) return null;
  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
  if (cadence === "QUARTERLY") return `${formatted}/quarter`;
  return `${formatted}/month`;
}

export function formatDistance(km: number | null): string | null {
  if (km == null) return null;
  if (km < 1) return `${Math.round(km * 10) / 10} km away`;
  return `${km} km away`;
}

export function formatRating(avg: number | null, count: number): string | null {
  if (avg == null || count <= 0) return null;
  return avg.toFixed(1);
}
