import {
  type MapCoordinates,
  type OpeningHours,
  type OpeningHoursDay,
  type StudioBranch,
  WEEKDAY_LABELS,
} from "./types";

export const DESCRIPTION_MAX = 500;

export type FaqDraft = { id: string; question: string; answer: string };
export type TestimonialDraft = {
  id: string;
  quote: string;
  authorName: string;
  rating: string;
};

export type LocationEditDraft = {
  name: string;
  address: string;
  description: string;
  pricingBlurb: string;
  amenities: string[];
  hours: OpeningHours;
  coordinates: MapCoordinates | null;
  faqs: FaqDraft[];
  testimonials: TestimonialDraft[];
};

export type HoursGroup = {
  label: string;
  value: string;
};

export type CompletionItem = {
  id: string;
  label: string;
  done: boolean;
};

const WEEKDAY_SHORT = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

export function defaultHours(): OpeningHours {
  return {
    days: WEEKDAY_LABELS.map((_, day) => ({
      day,
      closed: day === 0,
      open: "09:00",
      close: "21:00",
    })),
  };
}

export function emptyLocationDraft(): LocationEditDraft {
  return {
    name: "",
    address: "",
    description: "",
    pricingBlurb: "",
    amenities: [],
    hours: defaultHours(),
    coordinates: null,
    faqs: [],
    testimonials: [],
  };
}

export function normalizeHours(
  hours: OpeningHours | null | undefined,
): OpeningHours {
  const fallbackDays = defaultHours().days ?? [];
  const incoming = hours?.days ?? [];
  const next: OpeningHours = {
    days: fallbackDays.map((fallback) => {
      const match = incoming.find((day) => day.day === fallback.day);
      if (!match) return fallback;
      return {
        day: fallback.day,
        closed: Boolean(match.closed),
        open: match.open ?? fallback.open,
        close: match.close ?? fallback.close,
      };
    }),
  };
  if (hours?.timezone) next.timezone = hours.timezone;
  if (hours?.notes?.trim()) next.notes = hours.notes.trim();
  return next;
}

export function draftFromBranch(branch: StudioBranch): LocationEditDraft {
  return {
    name: branch.name,
    address: branch.address,
    description: branch.description ?? "",
    pricingBlurb: branch.pricingBlurb ?? "",
    amenities: [...(branch.amenities ?? [])],
    hours: normalizeHours(branch.openingHours),
    coordinates:
      branch.latitude != null && branch.longitude != null
        ? { latitude: branch.latitude, longitude: branch.longitude }
        : null,
    faqs: (branch.faqs ?? []).map((faq) => ({
      id: crypto.randomUUID(),
      question: faq.question,
      answer: faq.answer,
    })),
    testimonials: (branch.testimonials ?? []).map((item) => ({
      id: crypto.randomUUID(),
      quote: item.quote,
      authorName: item.authorName,
      rating: item.rating != null ? String(item.rating) : "",
    })),
  };
}

export function normalizeDraft(draft: LocationEditDraft): LocationEditDraft {
  const hours = normalizeHours(draft.hours);
  return {
    name: draft.name.trim(),
    address: draft.address.trim(),
    description: draft.description.trim(),
    pricingBlurb: draft.pricingBlurb.trim(),
    amenities: [...draft.amenities].sort(),
    hours,
    coordinates: draft.coordinates
      ? {
          latitude: draft.coordinates.latitude,
          longitude: draft.coordinates.longitude,
        }
      : null,
    faqs: draft.faqs.map((faq) => ({
      id: faq.id,
      question: faq.question.trim(),
      answer: faq.answer.trim(),
    })),
    testimonials: draft.testimonials.map((item) => ({
      id: item.id,
      quote: item.quote.trim(),
      authorName: item.authorName.trim(),
      rating: item.rating.trim(),
    })),
  };
}

export function draftsEqual(a: LocationEditDraft, b: LocationEditDraft) {
  return (
    JSON.stringify(normalizeDraft(a)) === JSON.stringify(normalizeDraft(b))
  );
}

export function canSaveDraft(draft: LocationEditDraft) {
  return Boolean(
    draft.name.trim() && draft.address.trim() && draft.coordinates,
  );
}

export function completeFaqs(faqs: FaqDraft[]) {
  return faqs.filter((faq) => faq.question.trim() && faq.answer.trim());
}

export function completeTestimonials(items: TestimonialDraft[]) {
  return items
    .filter((item) => item.quote.trim() && item.authorName.trim())
    .map((item) => ({
      quote: item.quote.trim(),
      authorName: item.authorName.trim(),
      rating: item.rating ? Number(item.rating) : null,
    }));
}

export function applyHoursToWeekdays(hours: OpeningHours): OpeningHours {
  const days = normalizeHours(hours).days ?? [];
  const monday = days.find((day) => day.day === 1);
  if (!monday) return normalizeHours(hours);
  return {
    ...hours,
    days: days.map((day) =>
      day.day >= 1 && day.day <= 5 ? { ...monday, day: day.day } : day,
    ),
  };
}

export function copyPreviousDayHours(
  hours: OpeningHours,
  dayIndex: number,
): OpeningHours {
  const days = normalizeHours(hours).days ?? [];
  if (dayIndex <= 0) return { ...hours, days };
  const previous = days[dayIndex - 1];
  const current = days[dayIndex];
  if (!previous || !current) return { ...hours, days };
  return {
    ...hours,
    days: days.map((day, index) =>
      index === dayIndex ? { ...previous, day: current.day } : day,
    ),
  };
}

export function updateHoursDay(
  hours: OpeningHours,
  dayIndex: number,
  patch: Partial<OpeningHoursDay>,
): OpeningHours {
  const days = normalizeHours(hours).days ?? [];
  return {
    ...hours,
    days: days.map((day, index) =>
      index === dayIndex ? { ...day, ...patch, day: day.day } : day,
    ),
  };
}

function parseTimeMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

export function formatTimeLabel(value: string) {
  const minutes = parseTimeMinutes(value);
  if (minutes == null) return value;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  const hourText = hour12 < 10 ? `0${hour12}` : String(hour12);
  return `${hourText}:${String(mins).padStart(2, "0")} ${suffix}`;
}

export function formatDayHours(day: OpeningHoursDay) {
  if (day.closed) return "Closed";
  if (day.open && day.close) return `${day.open}–${day.close}`;
  return "—";
}

export function groupOpeningHours(hours: OpeningHours): HoursGroup[] {
  const days = [...(normalizeHours(hours).days ?? [])].sort(
    (a, b) => a.day - b.day,
  );
  const groups: { start: number; end: number; value: string }[] = [];

  for (const day of days) {
    const value = formatDayHours(day);
    const last = groups.at(-1);
    if (last && last.value === value && last.end === day.day - 1) {
      last.end = day.day;
    } else {
      groups.push({ start: day.day, end: day.day, value });
    }
  }

  return groups.map((group) => ({
    label:
      group.start === group.end
        ? (WEEKDAY_LABELS[group.start] ?? `Day ${group.start}`)
        : `${WEEKDAY_SHORT[group.start]}–${WEEKDAY_SHORT[group.end]}`,
    value: group.value,
  }));
}

export function currentHoursStatus(
  hours: OpeningHours,
  now: Date = new Date(),
) {
  const day = now.getDay();
  const row = normalizeHours(hours).days?.find((item) => item.day === day);
  if (!row || row.closed) {
    return { open: false, label: "Closed" };
  }

  const open = row.open ?? "09:00";
  const close = row.close ?? "21:00";
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = parseTimeMinutes(open);
  const closeMinutes = parseTimeMinutes(close);
  const isOpen =
    openMinutes != null &&
    closeMinutes != null &&
    nowMinutes >= openMinutes &&
    nowMinutes < closeMinutes;

  const range = `${formatTimeLabel(open)}–${formatTimeLabel(close)}`;
  return {
    open: isOpen,
    label: isOpen ? `Open · ${range}` : `Closed · ${range}`,
  };
}

export function locationEditCompletion(input: {
  draft: LocationEditDraft;
  mediaCount: number;
}): { items: CompletionItem[]; percent: number } {
  const draft = normalizeDraft(input.draft);
  const hoursReady = (draft.hours.days ?? []).length === 7;
  const items: CompletionItem[] = [
    {
      id: "details",
      label: "Location details",
      done: Boolean(draft.name && draft.address && draft.description),
    },
    {
      id: "map",
      label: "Address and map",
      done: draft.coordinates != null,
    },
    {
      id: "amenities",
      label: "Amenities",
      done: draft.amenities.length > 0,
    },
    {
      id: "hours",
      label: "Opening hours",
      done: hoursReady,
    },
    {
      id: "blurb",
      label: "Membership blurb",
      done: Boolean(draft.pricingBlurb),
    },
    {
      id: "notes",
      label: "Hours notes",
      done: Boolean(draft.hours.notes),
    },
    {
      id: "gallery",
      label: "Gallery photos and videos",
      done: input.mediaCount > 0,
    },
    {
      id: "faqs",
      label: "FAQs",
      done: completeFaqs(draft.faqs).length > 0,
    },
    {
      id: "testimonials",
      label: "Testimonials",
      done: completeTestimonials(draft.testimonials).length > 0,
    },
  ];
  const done = items.filter((item) => item.done).length;
  return {
    items,
    percent: items.length === 0 ? 0 : Math.round((done / items.length) * 100),
  };
}

export function formatSavedAt(iso: string, now: number = Date.now()) {
  const timestamp = new Date(iso).getTime();
  if (!Number.isFinite(timestamp)) return "Saved";
  const minutes = Math.max(0, Math.floor((now - timestamp) / 60000));
  if (minutes < 1) return "Saved just now";
  if (minutes === 1) return "Saved 1 minute ago";
  if (minutes < 60) return `Saved ${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return "Saved 1 hour ago";
  if (hours < 24) return `Saved ${hours} hours ago`;
  return "Saved earlier";
}
