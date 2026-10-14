import { fireEvent, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import type { StudioSubscription } from "./subscription-types";
import { SubscriptionsWorkspace } from "./subscriptions-workspace";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => (
    <a href={typeof to === "string" ? to : "/app/subscriptions"}>{children}</a>
  ),
}));

function plan(
  overrides: Partial<StudioSubscription> &
    Pick<StudioSubscription, "id" | "name">,
): StudioSubscription {
  return {
    kind: "INDIVIDUAL",
    individualAudience: "ADULT",
    billingCadence: "MONTHLY",
    price: 1200,
    adultSeats: 1,
    kidSeats: 0,
    active: true,
    membershipCount: 0,
    canDelete: true,
    ...overrides,
  };
}

const plans: StudioSubscription[] = [
  plan({
    id: "aq",
    name: "Adult Quarterly",
    billingCadence: "QUARTERLY",
    price: 3200,
  }),
  plan({
    id: "km",
    name: "Kids Monthly",
    individualAudience: "KID",
    price: 2000,
    adultSeats: 0,
    kidSeats: 1,
    membershipCount: 1,
    canDelete: false,
  }),
];

const noop = {
  onEdit: vi.fn(),
  onDuplicate: vi.fn(),
  onArchive: vi.fn(),
  onViewSubscribers: vi.fn(),
  onCloseSubscribers: vi.fn(),
};

describe("SubscriptionsWorkspace", () => {
  it("renders plans, summary, and overview", () => {
    renderWithProviders(
      <SubscriptionsWorkspace
        subscriptions={plans}
        activity={[
          {
            id: "a1",
            planName: "Kids Monthly",
            verb: "Activated",
            actor: "Staff",
            at: "2025-04-12T04:54:00.000Z",
          },
        ]}
        subscribers={null}
        {...noop}
      />,
    );

    expect(screen.getAllByText("Adult Quarterly").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Kids Monthly").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Subscription overview").length).toBeGreaterThan(
      0,
    );
    expect(
      screen.getAllByText("Kids Monthly — Activated").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("link", { name: /Create plan/i }).length,
    ).toBeGreaterThan(0);
  });

  it("filters the list by billing period", () => {
    renderWithProviders(
      <SubscriptionsWorkspace
        subscriptions={plans}
        activity={[]}
        subscribers={null}
        {...noop}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Quarterly" }));
    expect(
      screen.getByRole("heading", { name: "Adult Quarterly" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Kids Monthly" }),
    ).not.toBeInTheDocument();
  });

  it("shows the empty getting started state", () => {
    renderWithProviders(
      <SubscriptionsWorkspace
        subscriptions={[]}
        activity={[]}
        subscribers={null}
        {...noop}
      />,
    );

    expect(screen.getByText("No subscription plans yet")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Create subscription/i }),
    ).toBeInTheDocument();
  });
});
