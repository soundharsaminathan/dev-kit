import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { LeadCard } from "./lead-card";
import type { Lead } from "./types";

const toast = vi.hoisted(() => vi.fn());

vi.mock("@dev-ui/components/toast", () => ({
  useToastContext: () => ({ toast }),
}));

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

describe("LeadCard call button", () => {
  afterEach(() => {
    toast.mockClear();
    vi.unstubAllGlobals();
  });

  it("dials through a primary button instead of a router-captured link", () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { assign });

    renderWithProviders(<LeadCard lead={lead()} filter="all" />);

    const button = screen.getByRole("button", { name: "Call Asha Rao" });
    expect(button).toHaveAttribute("data-variant", "primary");
    fireEvent.click(button);
    expect(assign).toHaveBeenCalledWith("tel:+919123456789");
  });

  it("disables the call button when the lead has no phone", () => {
    renderWithProviders(
      <LeadCard lead={lead({ phone: null })} filter="all" />,
    );

    expect(
      screen.getByRole("button", { name: "No phone number" }),
    ).toBeDisabled();
    expect(screen.getByText("No mobile on file")).toBeInTheDocument();
  });

  it("shows age next to the name and copies the mobile number", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      clipboard: { writeText },
    });

    renderWithProviders(<LeadCard lead={lead()} filter="all" />);

    expect(screen.getByText("Asha Rao")).toBeInTheDocument();
    expect(screen.getByText("20–40")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Copy +91 91234 56789" }),
    );

    expect(writeText).toHaveBeenCalledWith("+91 91234 56789");
    await vi.waitFor(() => {
      expect(toast).toHaveBeenCalledWith({
        title: "Mobile number copied",
        variant: "success",
      });
    });
  });
});
