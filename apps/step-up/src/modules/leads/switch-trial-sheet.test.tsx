import { fireEvent, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { SwitchTrialSheet } from "./switch-trial-sheet";
import { addLocalDays, type Lead, localDateKey, type TrialSlot } from "./types";

const get = vi.fn();
const patch = vi.fn();

vi.mock("@dev-ui/components/toast", () => ({
  useToastContext: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/api-context", () => ({
  useApi: () => ({ get, patch }),
}));

vi.mock("@/modules/ui/app-drawer", () => ({
  AppDrawer: ({
    children,
    footer,
    toolbar,
    title,
  }: {
    children: ReactNode;
    footer?: ReactNode;
    toolbar?: ReactNode;
    title?: string;
  }) => (
    <div>
      <h2>{title}</h2>
      {toolbar}
      {children}
      {footer}
    </div>
  ),
}));

function isoAt(date: Date, hour = 10) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hour,
    0,
    0,
  ).toISOString();
}

function slot(
  sessionId: string,
  startsAt: string,
  batchName = "Hip hop",
): TrialSlot {
  return {
    sessionId,
    batchId: `batch-${sessionId}`,
    batchName,
    styleBadge: "Hip hop",
    startsAt,
    endsAt: startsAt,
  };
}

function lead(sessionStartsAt: string): Lead {
  return {
    id: "lead-1",
    name: "Asha Rao",
    phone: "+91 91234 56789",
    photoUrl: null,
    ageRange: "TWENTY_TO_FORTY",
    createdAt: "2026-08-01T10:00:00.000Z",
    active: true,
    section: "trialBooked",
    trialBooking: {
      id: "bk-1",
      status: "PENDING",
      sessionId: "session-today",
      sessionStartsAt,
      batchName: "Hip hop",
    },
  };
}

describe("SwitchTrialSheet date filter", () => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = addLocalDays(today, 1);
  const later = addLocalDays(today, 6);
  const emptyDay = addLocalDays(today, 2);
  const todayKey = localDateKey(today);
  const tomorrowKey = localDateKey(tomorrow);
  const laterKey = localDateKey(later);
  const emptyKey = localDateKey(emptyDay);

  const slots: TrialSlot[] = [
    slot("session-today", isoAt(today), "Today batch"),
    slot("session-tomorrow", isoAt(tomorrow), "Tomorrow batch"),
    slot("session-later", isoAt(later), "Later batch"),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    get.mockImplementation((url: string) => {
      const params = new URLSearchParams(url.split("?")[1] ?? "");
      const from = params.get("from");
      const to = params.get("to");
      if (!from || !to) return Promise.resolve(slots);
      const fromMs = new Date(from).getTime();
      const toMs = new Date(to).getTime();
      return Promise.resolve(
        slots.filter((slot) => {
          const startsAtMs = new Date(slot.startsAt).getTime();
          return startsAtMs >= fromMs && startsAtMs < toMs;
        }),
      );
    });
    patch.mockResolvedValue({});
  });

  it("defaults to the trial caller date and hides other days", async () => {
    renderWithProviders(
      <SwitchTrialSheet
        lead={lead(isoAt(today))}
        studioId="studio-1"
        dateFilter="today"
        onOpenChange={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByTestId("switch-trial-slot-session-today"),
      ).toBeTruthy();
    });

    expect(screen.getByTestId("switch-trial-filter-today")).toHaveAttribute(
      "data-selected",
      "true",
    );
    expect(screen.getByTestId("switch-trial-date")).toHaveValue(todayKey);
    expect(
      screen.queryByTestId("switch-trial-slot-session-tomorrow"),
    ).toBeNull();
    expect(screen.queryByTestId("switch-trial-slot-session-later")).toBeNull();
  });

  it("lets staff change the date to see other sessions", async () => {
    renderWithProviders(
      <SwitchTrialSheet
        lead={lead(isoAt(today))}
        studioId="studio-1"
        dateFilter="today"
        onOpenChange={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByTestId("switch-trial-slot-session-today"),
      ).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("switch-trial-filter-tomorrow"));

    expect(screen.getByTestId("switch-trial-date")).toHaveValue(tomorrowKey);
    await waitFor(() => {
      expect(
        screen.getByTestId("switch-trial-slot-session-tomorrow"),
      ).toBeTruthy();
    });
    expect(screen.queryByTestId("switch-trial-slot-session-today")).toBeNull();

    fireEvent.change(screen.getByTestId("switch-trial-date"), {
      target: { value: laterKey },
    });

    await waitFor(() => {
      expect(
        screen.getByTestId("switch-trial-slot-session-later"),
      ).toBeTruthy();
    });
    expect(
      screen.queryByTestId("switch-trial-slot-session-tomorrow"),
    ).toBeNull();
    expect(screen.getByTestId("switch-trial-filter-today")).not.toHaveAttribute(
      "data-selected",
    );
  });

  it("lets staff pick any future date with no upper limit", async () => {
    renderWithProviders(
      <SwitchTrialSheet
        lead={lead(isoAt(today))}
        studioId="studio-1"
        dateFilter="today"
        onOpenChange={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByTestId("switch-trial-slot-session-today"),
      ).toBeTruthy();
    });

    expect(screen.getByTestId("switch-trial-date")).not.toHaveAttribute("max");
  });

  it("shows an empty state when the selected date has no sessions", async () => {
    renderWithProviders(
      <SwitchTrialSheet
        lead={lead(isoAt(today))}
        studioId="studio-1"
        dateFilter="today"
        onOpenChange={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByTestId("switch-trial-slot-session-today"),
      ).toBeTruthy();
    });

    fireEvent.change(screen.getByTestId("switch-trial-date"), {
      target: { value: emptyKey },
    });

    await waitFor(() => {
      expect(screen.getByText("No sessions on this date")).toBeTruthy();
    });
    expect(screen.queryByTestId("switch-trial-slot-session-today")).toBeNull();
  });
});
