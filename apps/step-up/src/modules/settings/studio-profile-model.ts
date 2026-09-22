export const TAGLINE_MAX = 80;
export const ABOUT_MAX = 2000;
export const TRIAL_MAX = 200;
export const WHAT_TO_BRING_MAX = 500;
export const MIN_FOUNDED_YEAR = 1950;

export type ProfileValues = {
  name: string;
  tagline: string;
  foundedYear: string;
  about: string;
  address: string;
  contact: string;
  whatsapp: string;
  email: string;
  instagramUrl: string;
  youtubeUrl: string;
  websiteUrl: string;
  trialBlurb: string;
  whatToBring: string;
};

export const EMPTY_PROFILE_VALUES: ProfileValues = {
  name: "",
  tagline: "",
  foundedYear: "",
  about: "",
  address: "",
  contact: "",
  whatsapp: "",
  email: "",
  instagramUrl: "",
  youtubeUrl: "",
  websiteUrl: "",
  trialBlurb: "",
  whatToBring: "",
};

export type SocialKey = "instagram" | "youtube" | "whatsapp";

export const DEFAULT_SOCIALS: SocialKey[] = ["instagram", "youtube"];

export const PHONE_COUNTRIES = [
  { iso: "IN", dial: "+91", name: "India", flag: "IN" },
  { iso: "US", dial: "+1", name: "United States", flag: "US" },
  { iso: "AE", dial: "+971", name: "United Arab Emirates", flag: "AE" },
  { iso: "GB", dial: "+44", name: "United Kingdom", flag: "GB" },
  { iso: "SG", dial: "+65", name: "Singapore", flag: "SG" },
  { iso: "AU", dial: "+61", name: "Australia", flag: "AU" },
  { iso: "CA", dial: "+1", name: "Canada", flag: "CA" },
  { iso: "MY", dial: "+60", name: "Malaysia", flag: "MY" },
] as const;

export type PhoneCountryIso = (typeof PHONE_COUNTRIES)[number]["iso"];

export type CompletionItem = {
  id: string;
  label: string;
  done: boolean;
};

export type ProfileCompletionInput = {
  values: ProfileValues;
  hasLogo: boolean;
  danceStyleCount: number;
  galleryCount: number;
  faqCount: number;
  testimonialCount: number;
};

export function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function foundedYearOptions(now = new Date()) {
  const latest = now.getFullYear();
  const years: number[] = [];
  for (let year = latest; year >= MIN_FOUNDED_YEAR; year -= 1) {
    years.push(year);
  }
  return years;
}

export function splitPhone(value: string): {
  iso: PhoneCountryIso;
  national: string;
} {
  const trimmed = value.trim();
  const ranked = [...PHONE_COUNTRIES].sort(
    (a, b) => b.dial.length - a.dial.length,
  );

  if (trimmed.startsWith("+")) {
    const match = ranked.find(
      (country) =>
        trimmed === country.dial || trimmed.startsWith(`${country.dial}`),
    );
    if (match) {
      return {
        iso: match.iso,
        national: trimmed.slice(match.dial.length).replace(/\D/g, ""),
      };
    }
  }

  const digits = trimmed.replace(/\D/g, "");
  const withPlus = `+${digits}`;
  const match = ranked.find(
    (country) =>
      digits.startsWith(country.dial.slice(1)) &&
      digits.length > country.dial.slice(1).length,
  );
  if (match && (trimmed.startsWith("+") || withPlus.startsWith(match.dial))) {
    return {
      iso: match.iso,
      national: digits.slice(match.dial.slice(1).length),
    };
  }

  return { iso: "IN", national: digits };
}

export function joinPhone(iso: PhoneCountryIso, national: string) {
  const country =
    PHONE_COUNTRIES.find((item) => item.iso === iso) ?? PHONE_COUNTRIES[0];
  const digits = national.replace(/\D/g, "");
  if (!digits) return "";
  return `${country.dial}${digits}`;
}

export function visibleSocials(values: Pick<ProfileValues, "whatsapp">) {
  if (values.whatsapp.trim()) {
    return [...DEFAULT_SOCIALS, "whatsapp"] as SocialKey[];
  }
  return [...DEFAULT_SOCIALS];
}

export function nextSocialToAdd(visible: SocialKey[]): SocialKey | null {
  if (!visible.includes("whatsapp")) return "whatsapp";
  return null;
}

export function studioProfileCompletion(input: ProfileCompletionInput): {
  items: CompletionItem[];
  percent: number;
} {
  const items: CompletionItem[] = [
    {
      id: "basic",
      label: "Basic information",
      done: Boolean(input.values.name.trim()),
    },
    {
      id: "contact",
      label: "Contact information",
      done: Boolean(input.values.contact.trim()),
    },
    {
      id: "address",
      label: "Address",
      done: Boolean(input.values.address.trim()),
    },
    {
      id: "styles",
      label: "Dance styles",
      done: input.danceStyleCount > 0,
    },
    {
      id: "branding",
      label: "Branding",
      done: input.hasLogo,
    },
    {
      id: "gallery",
      label: "Gallery",
      done: input.galleryCount > 0,
    },
    {
      id: "faqs",
      label: "FAQs",
      done: input.faqCount > 0,
    },
    {
      id: "testimonials",
      label: "Testimonials",
      done: input.testimonialCount > 0,
    },
  ];

  const done = items.filter((item) => item.done).length;
  return {
    items,
    percent: items.length === 0 ? 0 : Math.round((done / items.length) * 100),
  };
}

export function countryFlag(iso: string) {
  return iso
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

export function locationLabel(address: string) {
  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return parts.slice(-2).join(", ");
  }
  return address.trim();
}
