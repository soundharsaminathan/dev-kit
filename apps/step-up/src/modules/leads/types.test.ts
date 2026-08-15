import { describe, expect, it } from "vitest";
import {
  canConfirmTrialSession,
  defaultSessionDateKey,
  emptyLeadsTitle,
  formatFollowupChip,
  isDateKey,
  isTrialSoon,
  type LeadDateRange,
  type LeadTrialBooking,
  localDateKey,
  matchesLeadSearch,
  matchingPreset,
  phoneTelHref,
  presetRange,
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

describe("formatFollowupChip", () => {
  const now = new Date("2026-08-15T12:00:00.000Z");

  it("labels a missing follow-up", () => {
    expect(formatFollowupChip(null, now)).toBe("No follow-up");
  });

  it("uses compact relative time", () => {
    expect(formatFollowupChip("2026-08-15T11:59:30.000Z", now)).toBe(
      "just now",
    );
    expect(formatFollowupChip("2026-08-15T10:00:00.000Z", now)).toBe("2h ago");
    expect(formatFollowupChip("2026-08-12T12:00:00.000Z", now)).toBe("3d ago");
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
    expect(matchesLeadSearch(lead, "9123456789")).toBe(true);
    expect(matchesLeadSearch(lead, "priya")).toBe(false);
    expect(matchesLeadSearch(lead, "  ")).toBe(true);
  });
});

describe("emptyLeadsTitle", () => {
  it("names the date range and search empty states", () => {
    expect(emptyLeadsTitle(null, false)).toBe("No leads yet");
    expect(emptyLeadsTitle(null, true)).toBe("No matching leads");
    expect(
      emptyLeadsTitle({ from: "2026-08-14", to: "2026-08-14" }, false),
    ).toBe("No trials on this date");
    expect(
      emptyLeadsTitle({ from: "2026-08-10", to: "2026-08-16" }, false),
    ).toBe("No trials in this date range");
  });
});

describe("SWITCH_DATE_FILTERS", () => {
  it("keeps switch-trial chips on single days", () => {
    expect([...SWITCH_DATE_FILTERS]).toEqual(["all", "today", "tomorrow"]);
  });
});

describe("date range helpers", () => {
  const now = new Date(2026, 7, 14, 10, 0, 0);

  it("validates YYYY-MM-DD keys", () => {
    expect(isDateKey("2026-08-14")).toBe(true);
    expect(isDateKey("2026-02-31")).toBe(false);
    expect(isDateKey("2026-13-01")).toBe(false);
    expect(isDateKey("bad")).toBe(false);
  });

  it("computes preset ranges in local time", () => {
    expect(presetRange("today", now)).toEqual({
      from: "2026-08-14",
      to: "2026-08-14",
    });
    expect(presetRange("tomorrow", now)).toEqual({
      from: "2026-08-15",
      to: "2026-08-15",
    });
    expect(presetRange("thisWeek", now)).toEqual({
      from: "2026-08-10",
      to: "2026-08-16",
    });
    expect(presetRange("nextWeek", now)).toEqual({
      from: "2026-08-17",
      to: "2026-08-23",
    });
    expect(presetRange("last7", now)).toEqual({
      from: "2026-08-08",
      to: "2026-08-14",
    });
  });

  it("matches a range back to its preset", () => {
    const range: LeadDateRange = { from: "2026-08-10", to: "2026-08-16" };
    expect(matchingPreset(range, now)).toBe("thisWeek");
    expect(matchingPreset(null, now)).toBeNull();
    expect(matchingPreset({ from: "2026-08-11", to: "2026-08-16" }, now)).toBe(
      null,
    );
  });

  it("treats any active range as call-soon", () => {
    const soon = "2026-08-20T10:00:00.000Z";
    expect(isTrialSoon(soon, { from: "2026-08-16", to: "2026-08-23" })).toBe(
      true,
    );
    expect(isTrialSoon(null, { from: "2026-08-16", to: "2026-08-23" })).toBe(
      false,
    );
  });
});
