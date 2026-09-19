import { describe, expect, it } from "vitest";
import {
  applyHoursToWeekdays,
  canSaveDraft,
  completeFaqs,
  completeTestimonials,
  copyPreviousDayHours,
  currentHoursStatus,
  defaultHours,
  draftFromBranch,
  draftsEqual,
  emptyLocationDraft,
  formatDayHours,
  formatSavedAt,
  formatTimeLabel,
  groupOpeningHours,
  locationEditCompletion,
  normalizeHours,
  updateHoursDay,
} from "./location-edit-draft";
import type { OpeningHours, StudioBranch } from "./types";

function hoursFixture(): OpeningHours {
  return {
    days: [
      { day: 0, closed: true, open: "09:00", close: "21:00" },
      { day: 1, closed: false, open: "09:00", close: "21:00" },
      { day: 2, closed: false, open: "10:00", close: "20:00" },
      { day: 3, closed: false, open: "10:00", close: "20:00" },
      { day: 4, closed: false, open: "10:00", close: "20:00" },
      { day: 5, closed: false, open: "10:00", close: "20:00" },
      { day: 6, closed: false, open: "11:00", close: "18:00" },
    ],
  };
}

describe("location edit draft helpers", () => {
  it("defaults Sunday closed and weekdays 09:00–21:00", () => {
    const hours = defaultHours();
    expect(hours.days?.[0]?.closed).toBe(true);
    expect(hours.days?.[1]).toMatchObject({
      closed: false,
      open: "09:00",
      close: "21:00",
    });
  });

  it("pads missing opening-hour days from the weekly template", () => {
    const hours = normalizeHours({
      days: [{ day: 1, closed: false, open: "08:00", close: "16:00" }],
      notes: "  Late evenings by appointment  ",
    });
    expect(hours.days).toHaveLength(7);
    expect(hours.days?.[1]).toMatchObject({
      open: "08:00",
      close: "16:00",
    });
    expect(hours.days?.[0]?.closed).toBe(true);
    expect(hours.notes).toBe("Late evenings by appointment");
  });

  it("copies Monday onto weekday days and leaves the weekend alone", () => {
    const next = applyHoursToWeekdays(hoursFixture());
    expect(next.days?.[1]).toMatchObject({ open: "09:00", close: "21:00" });
    expect(next.days?.[5]).toMatchObject({
      day: 5,
      open: "09:00",
      close: "21:00",
    });
    expect(next.days?.[0]?.closed).toBe(true);
    expect(next.days?.[6]).toMatchObject({ open: "11:00", close: "18:00" });
  });

  it("copies the previous day and ignores Sunday", () => {
    const hours = hoursFixture();
    expect(copyPreviousDayHours(hours, 0).days?.[0]?.closed).toBe(true);
    expect(copyPreviousDayHours(hours, 1).days?.[1]).toMatchObject({
      day: 1,
      closed: true,
    });
    expect(copyPreviousDayHours(hours, 6).days?.[6]).toMatchObject({
      day: 6,
      open: "10:00",
      close: "20:00",
    });
  });

  it("updates a single hours row without dropping the rest of the week", () => {
    const next = updateHoursDay(hoursFixture(), 6, { closed: true });
    expect(next.days?.[6]?.closed).toBe(true);
    expect(next.days?.[1]?.open).toBe("09:00");
  });

  it("groups consecutive days that share the same hours", () => {
    const groups = groupOpeningHours({
      days: [
        { day: 0, closed: true },
        { day: 1, closed: false, open: "09:00", close: "21:00" },
        { day: 2, closed: false, open: "09:00", close: "21:00" },
        { day: 3, closed: false, open: "09:00", close: "21:00" },
        { day: 4, closed: false, open: "09:00", close: "21:00" },
        { day: 5, closed: false, open: "09:00", close: "21:00" },
        { day: 6, closed: false, open: "09:00", close: "21:00" },
      ],
    });
    expect(groups).toEqual([
      { label: "Sunday", value: "Closed" },
      { label: "Mon–Sat", value: "09:00–21:00" },
    ]);
    expect(formatDayHours({ day: 0, closed: true })).toBe("Closed");
  });

  it("formats clock labels and today’s open or closed status", () => {
    expect(formatTimeLabel("09:00")).toBe("09:00 AM");
    expect(formatTimeLabel("21:00")).toBe("09:00 PM");
    const monday = new Date("2026-09-21T10:30:00");
    const late = new Date("2026-09-21T22:15:00");
    const sunday = new Date("2026-09-20T10:30:00");
    const hours = defaultHours();
    expect(currentHoursStatus(hours, monday)).toEqual({
      open: true,
      label: "Open · 09:00 AM–09:00 PM",
    });
    expect(currentHoursStatus(hours, late)).toEqual({
      open: false,
      label: "Closed · 09:00 AM–09:00 PM",
    });
    expect(currentHoursStatus(hours, sunday)).toEqual({
      open: false,
      label: "Closed",
    });
  });

  it("treats amenity order as equal and requires name, address, and a pin to save", () => {
    const a = emptyLocationDraft();
    a.name = "Casagrand Supremus";
    a.address = "OMR, Chennai";
    a.amenities = ["wifi", "parking"];
    a.coordinates = { latitude: 12.9, longitude: 80.2 };
    const b = { ...a, amenities: ["parking", "wifi"] };
    expect(draftsEqual(a, b)).toBe(true);
    expect(canSaveDraft(a)).toBe(true);
    expect(canSaveDraft({ ...a, coordinates: null })).toBe(false);
    expect(canSaveDraft({ ...a, name: "  " })).toBe(false);
  });

  it("hydrates a branch and scores optional public profile completion", () => {
    const branch = {
      id: "br_1",
      studioId: "st_1",
      name: "Casagrand Supremus",
      address: "OMR, Chennai",
      latitude: 12.9,
      longitude: 80.2,
      description: "Spacious studios.",
      coverMediaId: null,
      coverMedia: null,
      amenities: ["parking"],
      openingHours: defaultHours(),
      pricingBlurb: null,
      faqs: [],
      testimonials: [],
      media: [],
    } satisfies StudioBranch;

    const draft = draftFromBranch(branch);
    expect(draft.coordinates).toEqual({ latitude: 12.9, longitude: 80.2 });
    expect(completeFaqs(draft.faqs)).toEqual([]);
    expect(completeTestimonials(draft.testimonials)).toEqual([]);

    const started = locationEditCompletion({ draft, mediaCount: 0 });
    expect(started.items.find((item) => item.id === "details")?.done).toBe(
      true,
    );
    expect(started.items.find((item) => item.id === "blurb")?.done).toBe(false);
    expect(started.percent).toBeLessThan(100);

    const finished = locationEditCompletion({
      draft: {
        ...draft,
        pricingBlurb: "Plans from the front desk.",
        hours: { ...draft.hours, notes: "Closed on public holidays." },
        faqs: [{ id: "f1", question: "Is parking free?", answer: "Yes." }],
        testimonials: [
          {
            id: "t1",
            quote: "Great floors.",
            authorName: "Meera",
            rating: "5",
          },
        ],
      },
      mediaCount: 2,
    });
    expect(finished.percent).toBe(100);
    expect(
      completeTestimonials([
        { id: "t1", quote: "Great floors.", authorName: "Meera", rating: "5" },
      ]),
    ).toEqual([{ quote: "Great floors.", authorName: "Meera", rating: 5 }]);
  });

  it("formats a relative saved timestamp", () => {
    const now = Date.parse("2026-09-20T12:00:00.000Z");
    expect(formatSavedAt("2026-09-20T11:59:20.000Z", now)).toBe(
      "Saved just now",
    );
    expect(formatSavedAt("2026-09-20T11:58:00.000Z", now)).toBe(
      "Saved 2 minutes ago",
    );
    expect(formatSavedAt("2026-09-20T10:00:00.000Z", now)).toBe(
      "Saved 2 hours ago",
    );
  });
});
