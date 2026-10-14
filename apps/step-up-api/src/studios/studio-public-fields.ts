import { BadRequestException } from "@nestjs/common";

const MIN_FOUNDED_YEAR = 1950;
const MAX_PHOTOS = 12;

export const STUDIO_PUBLIC_TEXT_LIMITS = {
  tagline: 80,
  about: 2000,
  whatToBring: 500,
  trialBlurb: 200,
} as const;

export type StudioPublicDetails = {
  tagline: string | null;
  about: string | null;
  foundedYear: number | null;
  email: string | null;
  whatsapp: string | null;
  instagramUrl: string | null;
  youtubeUrl: string | null;
  websiteUrl: string | null;
  whatToBring: string | null;
  trialBlurb: string | null;
};

export type StudioPublicDetailsInput = {
  tagline?: string | null;
  about?: string | null;
  foundedYear?: number | null;
  email?: string | null;
  whatsapp?: string | null;
  instagramUrl?: string | null;
  youtubeUrl?: string | null;
  websiteUrl?: string | null;
  whatToBring?: string | null;
  trialBlurb?: string | null;
  photos?: string[];
};

export function blankToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeOptionalText(
  value: string | null | undefined,
  max: number,
  label: string,
): string | null {
  const trimmed = blankToNull(value);
  if (!trimmed) return null;
  if (trimmed.length > max) {
    throw new BadRequestException(`${label} is too long`);
  }
  return trimmed;
}

export function normalizeOptionalEmail(
  value: string | null | undefined,
): string | null {
  const trimmed = blankToNull(value);
  if (!trimmed) return null;
  const email = trimmed.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new BadRequestException("Enter a valid email");
  }
  return email;
}

export function normalizeOptionalPhone(
  value: string | null | undefined,
  label: string,
): string | null {
  const trimmed = blankToNull(value);
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 10) {
    throw new BadRequestException(`Enter a valid ${label}`);
  }
  return trimmed;
}

function withHttps(value: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return value;
  return `https://${value}`;
}

function parseHttpUrl(value: string, label: string): URL {
  try {
    const parsed = new URL(withHttps(value));
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("protocol");
    }
    return parsed;
  } catch {
    throw new BadRequestException(`Enter a valid ${label}`);
  }
}

export function normalizeInstagramUrl(
  value: string | null | undefined,
): string | null {
  const trimmed = blankToNull(value);
  if (!trimmed) return null;
  const handle = trimmed.replace(/^@/, "");
  if (/^[A-Za-z0-9._]{1,30}$/.test(handle)) {
    return `https://instagram.com/${handle}`;
  }
  const parsed = parseHttpUrl(handle, "Instagram link");
  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
  if (host !== "instagram.com") {
    throw new BadRequestException("Enter a valid Instagram link");
  }
  const path = parsed.pathname.replace(/\/+$/, "");
  if (!path || path === "/") {
    throw new BadRequestException("Enter a valid Instagram link");
  }
  return `https://instagram.com${path}`;
}

export function normalizeYoutubeUrl(
  value: string | null | undefined,
): string | null {
  const trimmed = blankToNull(value);
  if (!trimmed) return null;
  const parsed = parseHttpUrl(trimmed, "YouTube link");
  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
  if (
    host !== "youtube.com" &&
    host !== "youtu.be" &&
    host !== "m.youtube.com"
  ) {
    throw new BadRequestException("Enter a valid YouTube link");
  }
  return parsed.toString();
}

export function normalizeWebsiteUrl(
  value: string | null | undefined,
): string | null {
  const trimmed = blankToNull(value);
  if (!trimmed) return null;
  return parseHttpUrl(trimmed, "website").toString();
}

export function normalizeFoundedYear(
  value: number | null | undefined,
): number | null {
  if (value == null) return null;
  const year = Number(value);
  const maxYear = new Date().getFullYear();
  if (!Number.isInteger(year) || year < MIN_FOUNDED_YEAR || year > maxYear) {
    throw new BadRequestException("Enter a valid founded year");
  }
  return year;
}

export function normalizePhotos(
  value: string[] | undefined,
): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new BadRequestException("Photos must be a list");
  }
  if (value.length > MAX_PHOTOS) {
    throw new BadRequestException("You can add up to 12 photos");
  }
  return value.map((item) => {
    if (typeof item !== "string") {
      throw new BadRequestException("Photos must be a list");
    }
    const trimmed = item.trim();
    if (!trimmed) {
      throw new BadRequestException("Photos must be a list");
    }
    return trimmed;
  });
}

export function normalizeStudioPublicDetails(
  data: StudioPublicDetailsInput,
): Partial<StudioPublicDetails> & { photos?: string[] } {
  const next: Partial<StudioPublicDetails> & { photos?: string[] } = {};

  if (data.tagline !== undefined) {
    next.tagline = normalizeOptionalText(
      data.tagline,
      STUDIO_PUBLIC_TEXT_LIMITS.tagline,
      "Tagline",
    );
  }
  if (data.about !== undefined) {
    next.about = normalizeOptionalText(
      data.about,
      STUDIO_PUBLIC_TEXT_LIMITS.about,
      "About",
    );
  }
  if (data.foundedYear !== undefined) {
    next.foundedYear = normalizeFoundedYear(data.foundedYear);
  }
  if (data.email !== undefined) {
    next.email = normalizeOptionalEmail(data.email);
  }
  if (data.whatsapp !== undefined) {
    next.whatsapp = normalizeOptionalPhone(data.whatsapp, "WhatsApp number");
  }
  if (data.instagramUrl !== undefined) {
    next.instagramUrl = normalizeInstagramUrl(data.instagramUrl);
  }
  if (data.youtubeUrl !== undefined) {
    next.youtubeUrl = normalizeYoutubeUrl(data.youtubeUrl);
  }
  if (data.websiteUrl !== undefined) {
    next.websiteUrl = normalizeWebsiteUrl(data.websiteUrl);
  }
  if (data.whatToBring !== undefined) {
    next.whatToBring = normalizeOptionalText(
      data.whatToBring,
      STUDIO_PUBLIC_TEXT_LIMITS.whatToBring,
      "What to bring",
    );
  }
  if (data.trialBlurb !== undefined) {
    next.trialBlurb = normalizeOptionalText(
      data.trialBlurb,
      STUDIO_PUBLIC_TEXT_LIMITS.trialBlurb,
      "Trial note",
    );
  }
  if (data.photos !== undefined) {
    next.photos = normalizePhotos(data.photos);
  }

  return next;
}
