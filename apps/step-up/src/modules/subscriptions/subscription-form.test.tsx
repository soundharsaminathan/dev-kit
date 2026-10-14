import { fireEvent, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { SubscriptionForm } from "./subscription-form";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

describe("SubscriptionForm", () => {
  it("updates the preview and submits create values", () => {
    const onSubmit = vi.fn();
    renderWithProviders(<SubscriptionForm mode="create" onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/Plan name/), {
      target: { value: "Adults Monthly" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Kid" }));
    fireEvent.click(screen.getByRole("button", { name: "Quarterly" }));
    fireEvent.change(screen.getByLabelText("Price amount"), {
      target: { value: "3200" },
    });

    const preview = screen.getByTestId("subscription-plan-preview");
    expect(preview).toHaveTextContent("Adults Monthly");
    expect(preview).toHaveTextContent("Kid");
    expect(preview).toHaveTextContent("Quarterly");

    fireEvent.click(screen.getByRole("button", { name: "Create plan" }));
    expect(onSubmit).toHaveBeenCalledWith({
      name: "Adults Monthly",
      individualAudience: "KID",
      billingCadence: "QUARTERLY",
      price: 3200,
      active: true,
    });
  });
});
