import { describe, expect, it } from "vitest";
import {
  canConfirmTrialSession,
  defaultSessionDateKey,
  emptyLeadsTitle,
  type LeadTrialBooking,
  localDateKey,
  matchesLeadSearch,
  phoneTelHref,
  SWITCH_DATE_FILTERS,
  slotMatchesDate,
} from "./types";

function trial(overrides: Partial<LeadTrialBooking> = {}): LeadTrialBooking {
  return {
    id: "bk-1",
    status: "PENDING",
    sessionId: "session-1",
    sessionStartsAt: "2026-08-14T10:00:00.000Z",
    batchName: "Trial",
    ...overrides,
  };
}

describe("phoneTelHref", () => {
  it("builds a tel link from a formatted mobile number", () => {
    expect(phoneTelHref("+91 91234 56789")).toBe("tel:+919123456789");
  });

  it("returns null when nothing dialable remains", () => {
    expect(phoneTelHref("Lead only")).toBeNull();
    expect(phoneTelHref("   ")).toBeNull();
  });
});

describe("canConfirmTrialSession", () => {
  it("allows confirm when a pending trial has a session", () => {
    expect(canConfirmTrialSession(trial())).toBe(true);
  });

  it("blocks confirm when the trial is already confirmed", () => {
    expect(canConfirmTrialSession(trial({ status: "CONFIRMED" }))).toBe(false);
  });

  it("blocks confirm when no session is picked yet", () => {
    expect(
      canConfirmTrialSession(trial({ sessionId: null, sessionStartsAt: null })),
    ).toBe(false);
  });

  it("blocks confirm when there is no trial booking", () => {
    expect(canConfirmTrialSession(null)).toBe(false);
  });
});

describe("session date filter", () => {
  const now = new Date(2026, 7, 14, 10, 0, 0);

  it("defaults to today or tomorrow from the trial caller filter", () => {
    expect(defaultSessionDateKey("today", now)).toBe("2026-08-14");
    expect(defaultSessionDateKey("tomorrow", now)).toBe("2026-08-15");
    expect(defaultSessionDateKey("thisWeek", now)).toBe("2026-08-14");
    expect(defaultSessionDateKey("nextWeek", now)).toBe("2026-08-17");
    expect(defaultSessionDateKey("all", now)).toBeNull();
  });

  it("matches slots on the selected local date and keeps all when unset", () => {
    const todaySlot = new Date(2026, 7, 14, 18, 30, 0).toISOString();
    const tomorrowSlot = new Date(2026, 7, 15, 9, 0, 0).toISOString();

    expect(slotMatchesDate(todaySlot, null)).toBe(true);
    expect(slotMatchesDate(todaySlot, "2026-08-14")).toBe(true);
    expect(slotMatchesDate(tomorrowSlot, "2026-08-14")).toBe(false);
    expect(slotMatchesDate("not-a-date", "2026-08-14")).toBe(false);
  });

  it("formats local calendar keys without UTC drift", () => {
    expect(localDateKey(new Date(2026, 7, 14, 0, 15, 0))).toBe("2026-08-14");
    expect(localDateKey(new Date(2026, 7, 14, 23, 45, 0))).toBe("2026-08-14");
  });
});

describe("matchesLeadSearch", () => {
  it("filters the card list by name or mobile number", () => {
    const lead = {
      name: "Asha Rao",
      phone: "+91 91234 56789",
    };
    expect(matchesLeadSearch(lead, "asha")).toBe(true);
    expect(matchesLeadSearch(lead, "91234")).toBe(true);
    expect(matchesLeadSearch(lead, "priya")).toBe(false);
    expect(matchesLeadSearch(lead, "  ")).toBe(true);
  });
});

describe("emptyLeadsTitle", () => {
  it("names the week filters and search empty states", () => {
    expect(emptyLeadsTitle("thisWeek", false)).toBe("No trials this week");
    expect(emptyLeadsTitle("nextWeek", false)).toBe("No trials next week");
    expect(emptyLeadsTitle("all", true)).toBe("No matching leads");
  });
});

describe("SWITCH_DATE_FILTERS", () => {
  it("keeps switch-trial chips on single days", () => {
    expect([...SWITCH_DATE_FILTERS]).toEqual(["all", "today", "tomorrow"]);
  });
});
