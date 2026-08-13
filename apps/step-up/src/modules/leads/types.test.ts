import { describe, expect, it } from "vitest";
import {
  canConfirmTrialSession,
  type LeadTrialBooking,
  phoneTelHref,
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
