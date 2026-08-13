import { describe, expect, it } from "vitest";
import { resolveLeadDayRange } from "./leads";

describe("resolveLeadDayRange", () => {
  it("returns null for all", () => {
    expect(resolveLeadDayRange("all")).toBeNull();
  });

  it("returns today midnight to end-of-day", () => {
    const range = resolveLeadDayRange("today");
    expect(range).not.toBeNull();
    if (!range) return;

    const now = new Date();
    expect(range.start.getFullYear()).toBe(now.getFullYear());
    expect(range.start.getMonth()).toBe(now.getMonth());
    expect(range.start.getDate()).toBe(now.getDate());
    expect(range.start.getHours()).toBe(0);
    expect(range.start.getMinutes()).toBe(0);
    expect(range.end.getHours()).toBe(23);
    expect(range.end.getMinutes()).toBe(59);
    expect(range.end.getDate()).toBe(now.getDate());
  });

  it("returns tomorrow midnight to end-of-day", () => {
    const range = resolveLeadDayRange("tomorrow");
    expect(range).not.toBeNull();
    if (!range) return;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(range.start.getDate()).toBe(tomorrow.getDate());
    expect(range.start.getHours()).toBe(0);
    expect(range.end.getDate()).toBe(tomorrow.getDate());
    expect(range.end.getHours()).toBe(23);
  });
});
