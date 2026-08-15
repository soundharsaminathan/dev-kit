import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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
    trialBooking: null,
    ...overrides,
  };
}

describe("LeadCard identity", () => {
  it("renders name and phone as text so the row can be swiped", () => {
    renderWithProviders(<LeadCard lead={lead()} range={null} />);

    expect(screen.getByTestId("lead-card-lead-1")).toBeInTheDocument();
    expect(screen.getByText("Asha Rao")).toBeInTheDocument();
    expect(screen.getByText("+91 91234 56789")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /view asha rao's profile/i }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: /copy \+91/i })).toBeNull();
  });
});

describe("LeadCard call button", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("dials through a primary button instead of a router-captured link", () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { assign });

    renderWithProviders(<LeadCard lead={lead()} range={null} />);

    const button = screen.getByRole("button", { name: "Call Asha Rao" });
    expect(button).toHaveAttribute("data-variant", "primary");
    fireEvent.click(button);
    expect(assign).toHaveBeenCalledWith("tel:+919123456789");
  });

  it("disables the call button when the lead has no phone", () => {
    renderWithProviders(<LeadCard lead={lead({ phone: null })} range={null} />);

    expect(
      screen.getByRole("button", { name: "No phone number" }),
    ).toBeDisabled();
    expect(screen.getByText("No mobile on file")).toBeInTheDocument();
  });

  it("shows age next to the name", () => {
    renderWithProviders(<LeadCard lead={lead()} range={null} />);

    expect(screen.getByText("Asha Rao")).toBeInTheDocument();
    expect(screen.getByText("20–40")).toBeInTheDocument();
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
      "Confirmed",
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
