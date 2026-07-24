import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { EventChip } from "./event-chip";
import type { CalendarEvent } from "./types";

const event: CalendarEvent = {
  id: "evt-1",
  kind: "SESSION",
  title: "Kids Hip Hop",
  startsAt: "2026-07-20T12:30:00.000Z",
  endsAt: "2026-07-20T13:30:00.000Z",
  status: "SCHEDULED",
};

describe("EventChip", () => {
  it("calls onSelect with the event", () => {
    const onSelect = vi.fn();
    renderWithProviders(<EventChip event={event} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button", { name: /Kids Hip Hop/i }));
    expect(onSelect).toHaveBeenCalledWith(event);
  });

  it("hides time text in compact mode", () => {
    renderWithProviders(<EventChip event={event} compact />);
    expect(screen.getByText("Kids Hip Hop")).toBeInTheDocument();
    expect(screen.queryByText(/\d{1,2}:\d{2}/)).not.toBeInTheDocument();
  });
});
