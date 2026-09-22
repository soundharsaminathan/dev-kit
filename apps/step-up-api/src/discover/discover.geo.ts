const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance in km between two WGS84 points. */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function nearestDistanceKm(
  origin: { lat: number; lng: number },
  points: Array<{ latitude: number | null; longitude: number | null }>,
): number | null {
  let best: number | null = null;
  for (const point of points) {
    if (point.latitude == null || point.longitude == null) continue;
    const km = haversineKm(
      origin.lat,
      origin.lng,
      point.latitude,
      point.longitude,
    );
    if (!Number.isFinite(km)) continue;
    if (best == null || km < best) best = km;
  }
  return best;
}

export function roundDistanceKm(km: number): number {
  if (km < 10) return Math.round(km * 10) / 10;
  return Math.round(km);
}
