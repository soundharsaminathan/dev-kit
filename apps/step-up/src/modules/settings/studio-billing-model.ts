export const DEFAULT_STUDIO_TIMEZONE = "Asia/Kolkata";

export const GRACE_DAYS_MIN = 0;
export const GRACE_DAYS_MAX = 30;
export const EXPIRE_ALERT_DAYS_MIN = 0;
export const EXPIRE_ALERT_DAYS_MAX = 90;

export const FALLBACK_TIMEZONES = [
  DEFAULT_STUDIO_TIMEZONE,
  "Asia/Dubai",
  "Asia/Singapore",
  "Europe/London",
  "America/New_York",
  "UTC",
] as const;

const TIMEZONE_PLACES: Record<string, { city: string; country: string }> = {
  "Asia/Kolkata": { city: "Chennai", country: "India" },
  "Asia/Calcutta": { city: "Chennai", country: "India" },
  "Asia/Dubai": { city: "Dubai", country: "United Arab Emirates" },
  "Asia/Singapore": { city: "Singapore", country: "Singapore" },
  "Europe/London": { city: "London", country: "United Kingdom" },
  "America/New_York": { city: "New York", country: "United States" },
  UTC: { city: "UTC", country: "Worldwide" },
};

const TIMEZONE_ALIASES: Record<string, string[]> = {
  "Asia/Kolkata": ["Chennai", "Madras", "India", "IST", "Calcutta"],
  "Asia/Calcutta": ["Chennai", "Madras", "India", "IST", "Kolkata"],
  "Asia/Dubai": ["UAE", "GST"],
  "Europe/London": ["UK", "BST", "GMT"],
  "America/New_York": ["EST", "EDT", "USA"],
  UTC: ["GMT", "Zulu"],
};

export type BillingValues = {
  graceDays: string;
  expireAlertDays: string;
  timezone: string;
  admissionFee: string;
};

export type BillingFieldErrors = {
  graceDays?: string;
  expireAlertDays?: string;
  admissionFee?: string;
  timezone?: string;
};

export type BillingPayload = {
  graceDays?: number;
  expireAlertDays: number;
  timezone?: string;
  admissionFee?: number;
};

export type TimezoneOption = {
  id: string;
  region: string;
  city: string;
  country: string | null;
  offset: string;
  label: string;
  textValue: string;
};

export type TimezonePlace = {
  city: string;
  country: string | null;
  offset: string;
};

const admissionFormat = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export function isValidIanaTimeZone(timeZone: string): boolean {
  const trimmed = timeZone.trim();
  if (!trimmed) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: trimmed });
    return true;
  } catch {
    return false;
  }
}

export function parseBoundedInteger(
  raw: string,
  min: number,
  max: number,
): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || !Number.isInteger(value)) return null;
  if (value < min || value > max) return null;
  return value;
}

export function parseAmount(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

export function isAdmissionEnabled(raw: string | number): boolean {
  const value = typeof raw === "number" ? raw : parseAmount(raw);
  return value != null && value > 0;
}

export function formatAdmissionFee(amount: number): string {
  const integer = Number.isInteger(amount);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: integer ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatAdmissionInput(amount: number): string {
  return admissionFormat.format(amount).replace(/^₹\s?/, "");
}

export function billingFieldErrors(
  values: BillingValues,
  options: { isOwner: boolean },
): BillingFieldErrors {
  const errors: BillingFieldErrors = {};

  if (
    parseBoundedInteger(
      values.expireAlertDays,
      EXPIRE_ALERT_DAYS_MIN,
      EXPIRE_ALERT_DAYS_MAX,
    ) == null
  ) {
    errors.expireAlertDays = "Must be between 0 and 90 days.";
  }

  if (options.isOwner) {
    if (
      parseBoundedInteger(values.graceDays, GRACE_DAYS_MIN, GRACE_DAYS_MAX) ==
      null
    ) {
      errors.graceDays = "Must be between 0 and 30 days.";
    }
    if (parseAmount(values.admissionFee) == null) {
      errors.admissionFee = "Enter a valid amount.";
    }
    if (!isValidIanaTimeZone(values.timezone)) {
      errors.timezone = "Choose a valid studio timezone.";
    }
  }

  return errors;
}

export function hasBillingErrors(errors: BillingFieldErrors): boolean {
  return Boolean(
    errors.graceDays ||
      errors.expireAlertDays ||
      errors.admissionFee ||
      errors.timezone,
  );
}

export function buildBillingPayload(
  values: BillingValues,
  isOwner: boolean,
): BillingPayload {
  const payload: BillingPayload = {
    expireAlertDays: Number(values.expireAlertDays),
  };
  if (isOwner) {
    payload.graceDays = Number(values.graceDays);
    payload.timezone = values.timezone.trim();
    payload.admissionFee = Number(values.admissionFee);
  }
  return payload;
}

export function timezoneRegion(timeZone: string): string {
  const trimmed = timeZone.trim();
  if (!trimmed || trimmed === "UTC") return "UTC";
  return trimmed.split("/")[0] ?? "Other";
}

export function timezoneCityName(timeZone: string): string {
  const place = TIMEZONE_PLACES[timeZone.trim()];
  if (place) return place.city;
  const trimmed = timeZone.trim();
  if (!trimmed || trimmed === "UTC") return "UTC";
  const leaf = trimmed.split("/").pop() ?? trimmed;
  return leaf.replace(/_/g, " ");
}

export function timezoneOffsetLabel(
  timeZone: string,
  at: Date = new Date(),
): string {
  const trimmed = timeZone.trim();
  if (!trimmed || !isValidIanaTimeZone(trimmed)) return "";
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: trimmed,
      timeZoneName: "longOffset",
    }).formatToParts(at);
    const raw =
      parts.find((part) => part.type === "timeZoneName")?.value ?? "UTC";
    if (raw === "GMT" || raw === "UTC") return "UTC +00:00";
    const match = raw.match(/(?:GMT|UTC)([+-])(\d{1,2})(?::?(\d{2}))?/);
    if (!match) return raw.replace("GMT", "UTC ");
    const sign = match[1] ?? "+";
    const hours = (match[2] ?? "0").padStart(2, "0");
    const minutes = match[3] ?? "00";
    return `UTC ${sign}${hours}:${minutes}`;
  } catch {
    return "";
  }
}

export function timezonePlace(timeZone: string): TimezonePlace | null {
  const trimmed = timeZone.trim();
  if (!trimmed || !isValidIanaTimeZone(trimmed)) return null;
  const known = TIMEZONE_PLACES[trimmed];
  return {
    city: known?.city ?? timezoneCityName(trimmed),
    country: known?.country ?? null,
    offset: timezoneOffsetLabel(trimmed),
  };
}

export function timezoneConfirmation(timeZone: string): string[] {
  const place = timezonePlace(timeZone);
  if (!place) return [];
  const location = place.country
    ? `${place.city} · ${place.country}`
    : place.city;
  return place.offset ? [location, place.offset] : [location];
}

function supportedTimeZones(): string[] {
  const intl = Intl as typeof Intl & {
    supportedValuesOf?: (key: string) => string[];
  };
  try {
    const zones = intl.supportedValuesOf?.("timeZone") ?? [];
    return zones.length > 0 ? zones : [...FALLBACK_TIMEZONES];
  } catch {
    return [...FALLBACK_TIMEZONES];
  }
}

export function listStudioTimezones(at: Date = new Date()): TimezoneOption[] {
  const ids = new Set<string>([...FALLBACK_TIMEZONES, ...supportedTimeZones()]);
  const options: TimezoneOption[] = [];

  for (const id of ids) {
    if (!isValidIanaTimeZone(id)) continue;
    const region = timezoneRegion(id);
    const city = timezoneCityName(id);
    const country = TIMEZONE_PLACES[id]?.country ?? null;
    const offset = timezoneOffsetLabel(id, at);
    const aliases = TIMEZONE_ALIASES[id] ?? [];
    options.push({
      id,
      region,
      city,
      country,
      offset,
      label: offset ? `${region} / ${city} · ${offset}` : `${region} / ${city}`,
      textValue: [id, region, city, country, offset, ...aliases]
        .filter(Boolean)
        .join(" "),
    });
  }

  return options.sort((a, b) => {
    if (a.region !== b.region) return a.region.localeCompare(b.region);
    return a.city.localeCompare(b.city);
  });
}

export function gracePeriodLabel(days: number): string {
  return `${days}-day grace period`;
}

export function expiryReminderLabel(days: number): string {
  return days === 1 ? "1 day before" : `${days} days before`;
}

export function valuesFromSettings(
  settings: {
    graceDays?: number | null;
    expireAlertDays?: number | null;
    timezone?: string | null;
    admissionFee?: number | null;
  } | null,
): BillingValues {
  return {
    graceDays: String(settings?.graceDays ?? 3),
    expireAlertDays: String(settings?.expireAlertDays ?? 7),
    timezone: settings?.timezone || DEFAULT_STUDIO_TIMEZONE,
    admissionFee: String(settings?.admissionFee ?? 0),
  };
}
