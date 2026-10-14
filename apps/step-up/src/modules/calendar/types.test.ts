import { describe, expect, it } from "vitest";
import {
  addDays,
  type CalendarEvent,
  endOfWeek,
  eventPositionInDay,
  eventsForDay,
  rangeForView,
  startOfWeek,
} from "./types";

const event = (startsAt: string, endsAt: string, id = "e1"): CalendarEvent => ({
  id,
  kind: "SESSION",
  title: "Class",
  startsAt,
  endsAt,
  status: "SCHEDULED",
});

describe("week helpers", () => {
  it("starts week on Monday", () => {
    const sunday = new Date(2026, 6, 19);
    const monday = startOfWeek(sunday);
    expect(monday.getDay()).toBe(1);
    expect(monday.getDate()).toBe(13);
  });

  it("builds week and month ranges", () => {
    const focus = new Date(2026, 6, 15);
    const week = rangeForView(focus, "week");
    expect(startOfWeek(focus).getTime()).toBe(week.from.getTime());
    expect(endOfWeek(focus).getTime()).toBe(week.to.getTime());

    const month = rangeForView(focus, "month");
    expect(month.from.getTime()).toBeLessThanOrEqual(
      new Date(2026, 6, 1).getTime(),
    );
    expect(month.to.getTime()).toBeGreaterThanOrEqual(
      new Date(2026, 6, 31).getTime(),
    );
  });
});

describe("eventsForDay", () => {
  it("includes overlapping events", () => {
    const day = new Date(2026, 6, 20);
    const events = [
      event("2026-07-20T09:00:00.000Z", "2026-07-20T10:00:00.000Z", "a"),
      event("2026-07-21T09:00:00.000Z", "2026-07-21T10:00:00.000Z", "b"),
    ];
    const dayEvents = eventsForDay(events, day);
    expect(dayEvents.map((e) => e.id)).toEqual(["a"]);
  });
});

describe("eventPositionInDay", () => {
  it("computes top and height percentages", () => {
    const day = new Date(2026, 6, 20);
    const pos = eventPositionInDay(
      event(
        new Date(2026, 6, 20, 12, 0, 0).toISOString(),
        new Date(2026, 6, 20, 13, 0, 0).toISOString(),
      ),
      day,
    );
    expect(pos.top).toBeGreaterThan(45);
    expect(pos.top).toBeLessThan(55);
    expect(pos.height).toBeGreaterThan(3);
    expect(pos.height).toBeLessThan(6);
  });
});

describe("addDays", () => {
  it("shifts by days", () => {
    const d = addDays(new Date(2026, 6, 20), 7);
    expect(d.getDate()).toBe(27);
  });
});
