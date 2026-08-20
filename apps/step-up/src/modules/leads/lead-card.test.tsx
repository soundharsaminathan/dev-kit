import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { LeadCard } from "./lead-card";
import type { Lead, LeadTrialBooking } from "./types";

function trial(overrides: Partial<LeadTrialBooking> = {}): LeadTrialBooking {
  return {
    id: "bk-1",
    status: "PENDING",
    sessionId: "session-1",
    sessionStartsAt: "2026-08-20T10:00:00.000Z",
    batchName: "Saturday trial",
    ...overrides,
  };
}

function lead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: "lead-1",
    name: "Asha Rao",
    phone: "+91 91234 56789",
    photoUrl: null,
    ageRange: "TWENTY_TO_FORTY",
    createdAt: "2026-08-01T10:00:00.000Z",
    active: true,
    section: "new",
    lastFollowupAt: null,
    trialBooking: null,
    ...overrides,
  };
}

describe("LeadCard identity", () => {
  it("renders name, and a missing follow-up chip", () => {
    renderWithProviders(<LeadCard lead={lead()} range={null} />);

    expect(screen.getByTestId("lead-card-lead-1")).toBeInTheDocument();
    expect(screen.getByText("Asha Rao")).toBeInTheDocument();
    expect(screen.getByTestId("lead-followup-lead-1")).toHaveTextContent(
      "No follow-up",
    );
  });

  it("shows a relative last follow-up chip", () => {
    const now = Date.now();
    renderWithProviders(
      <LeadCard
        lead={lead({
          lastFollowupAt: new Date(now - 3 * 60_000).toISOString(),
        })}
        range={null}
      />,
    );

    expect(screen.getByTestId("lead-followup-lead-1")).toHaveTextContent(
      "3m ago",
    );
  });

  it("renders a primary call link for the lead phone", () => {
    renderWithProviders(<LeadCard lead={lead()} range={null} />);

    expect(screen.getByTestId("lead-call-lead-1")).toHaveAttribute(
      "href",
      "tel:+919123456789",
    );
  });

  it("hides the call button when phone is missing", () => {
    renderWithProviders(
      <LeadCard lead={lead({ phone: null })} range={null} />,
    );

    expect(screen.queryByTestId("lead-call-lead-1")).toBeNull();
  });
});

describe("LeadCard open", () => {
  it("opens on card click", () => {
    const onOpen = vi.fn();
    const row = lead();
    renderWithProviders(<LeadCard lead={row} range={null} onOpen={onOpen} />);

    fireEvent.click(screen.getByTestId("lead-open-lead-1"));
    expect(onOpen).toHaveBeenCalledWith(row);
  });

  it("does not open when a trial action is clicked", () => {
    const onOpen = vi.fn();
    const onSwitchTrial = vi.fn();
    const row = lead();
    renderWithProviders(
      <LeadCard
        lead={row}
        range={null}
        onOpen={onOpen}
        onSwitchTrial={onSwitchTrial}
      />,
    );

    fireEvent.click(screen.getByTestId("lead-pick-session-lead-1"));
    expect(onSwitchTrial).toHaveBeenCalledWith(row);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("does not open when the call button is clicked", () => {
    const onOpen = vi.fn();
    const row = lead();
    renderWithProviders(<LeadCard lead={row} range={null} onOpen={onOpen} />);

    fireEvent.click(screen.getByTestId("lead-call-lead-1"));
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("does not open when the select checkbox is toggled", () => {
    const onOpen = vi.fn();
    const onToggleSelect = vi.fn();
    const row = lead();
    renderWithProviders(
      <LeadCard
        lead={row}
        range={null}
        onOpen={onOpen}
        selected
        onToggleSelect={onToggleSelect}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Asha Rao" }));
    expect(onToggleSelect).toHaveBeenCalledWith(row);
    expect(onOpen).not.toHaveBeenCalled();
  });
});

describe("LeadCard confirm session", () => {
  it("confirms a pending trial with a session", () => {
    const onConfirmSession = vi.fn();
    const pending = lead({
      section: "trialBooked",
      trialBooking: trial(),
    });

    renderWithProviders(
      <LeadCard
        lead={pending}
        range={null}
        onConfirmSession={onConfirmSession}
        onSwitchTrial={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId("lead-confirm-session-lead-1"));
    expect(onConfirmSession).toHaveBeenCalledWith(pending);
  });

  it("hides confirm when the trial is already confirmed", () => {
    renderWithProviders(
      <LeadCard
        lead={lead({
          section: "trialBooked",
          trialBooking: trial({ status: "CONFIRMED" }),
        })}
        range={null}
        onConfirmSession={vi.fn()}
        onSwitchTrial={vi.fn()}
      />,
    );

    expect(screen.queryByTestId("lead-confirm-session-lead-1")).toBeNull();
    expect(screen.getByTestId("lead-confirmed-lead-1")).toHaveTextContent(
      "Booking confirmed",
    );
  });

  it("shows Today when the trial session is today", () => {
    const today = new Date();
    today.setHours(14, 0, 0, 0);
    renderWithProviders(
      <LeadCard
        lead={lead({
          section: "trialBooked",
          trialBooking: trial({ sessionStartsAt: today.toISOString() }),
        })}
        range={null}
        onConfirmSession={vi.fn()}
        onSwitchTrial={vi.fn()}
      />,
    );

    expect(screen.getByTestId("lead-trial-when-lead-1")).toHaveTextContent(
      "Today",
    );
  });

  it("hides confirm when no session is picked yet", () => {
    renderWithProviders(
      <LeadCard
        lead={lead({
          section: "trialBooked",
          trialBooking: trial({ sessionId: null, sessionStartsAt: null }),
        })}
        range={null}
        onConfirmSession={vi.fn()}
        onSwitchTrial={vi.fn()}
      />,
    );

    expect(screen.queryByTestId("lead-confirm-session-lead-1")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Pick session" }),
    ).toBeInTheDocument();
  });
});

describe("LeadCard pick session without a trial", () => {
  it("offers Pick session for a lead with no trial booking", () => {
    const onSwitchTrial = vi.fn();
    const noTrial = lead();

    renderWithProviders(
      <LeadCard lead={noTrial} range={null} onSwitchTrial={onSwitchTrial} />,
    );

    fireEvent.click(screen.getByTestId("lead-pick-session-lead-1"));
    expect(onSwitchTrial).toHaveBeenCalledWith(noTrial);
  });

  it("hides the action when onSwitchTrial is not provided", () => {
    renderWithProviders(<LeadCard lead={lead()} range={null} />);

    expect(screen.queryByTestId("lead-pick-session-lead-1")).toBeNull();
  });
});

describe("LeadCard selection", () => {
  it("renders a select checkbox and toggles the selected lead", () => {
    const onToggleSelect = vi.fn();
    const selectedLead = lead();

    renderWithProviders(
      <LeadCard
        lead={selectedLead}
        range={null}
        selected
        onToggleSelect={onToggleSelect}
      />,
    );

    const checkbox = screen.getByRole("checkbox", {
      name: "Select Asha Rao",
    });
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);
    expect(onToggleSelect).toHaveBeenCalledWith(selectedLead);
  });

  it("hides the checkbox when onToggleSelect is not provided", () => {
    renderWithProviders(<LeadCard lead={lead()} range={null} />);

    expect(screen.queryByRole("checkbox")).toBeNull();
  });
});
