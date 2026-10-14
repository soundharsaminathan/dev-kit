import type { DiscoverTrialSlot } from "./types";

export function whatsappHref(value: string) {
  return `https://wa.me/${value.replace(/\D/g, "")}`;
}

export function externalHref(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

export function instagramLabel(value: string) {
  try {
    const parsed = new URL(externalHref(value));
    const path = parsed.pathname.replace(/\/+$/, "");
    if (path && path !== "/") return path.replace(/^\//, "");
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return value.replace(/^@/, "");
  }
}

export function formatTrialSlot(slot: DiscoverTrialSlot) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(slot.startsAt));
}
