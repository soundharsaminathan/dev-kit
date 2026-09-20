import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { billingFieldErrors } from "./studio-billing-model";
import { StudioBillingWorkspace } from "./studio-billing-workspace";

const ownerValues = {
  graceDays: "3",
  expireAlertDays: "7",
  timezone: "Asia/Kolkata",
  admissionFee: "1000",
};

describe("StudioBillingWorkspace", () => {
  it("renders grouped billing cards and a live summary", () => {
    renderWithProviders(
      <StudioBillingWorkspace
        values={ownerValues}
        setField={vi.fn()}
        platformFeePercent={2.5}
        isOwner
        isDirty
        isPending={false}
        onSave={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Membership billing" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Admission fee" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Time & locale" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Platform fee" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Enabled")).toBeInTheDocument();
    expect(screen.getByText("Managed by Classa")).toBeInTheDocument();
    expect(screen.getByText("Chennai · India")).toBeInTheDocument();
    expect(screen.getAllByText("UTC +05:30").length).toBeGreaterThan(0);

    const summary = screen.getByTestId("billing-summary");
    expect(summary).toHaveTextContent("3 days grace");
    expect(summary).toHaveTextContent("7 days before");
    expect(summary).toHaveTextContent("₹1,000");
    expect(summary).toHaveTextContent("Asia/Kolkata");
    expect(
      screen.getByText("Your billing settings haven't been saved."),
    ).toBeInTheDocument();
    expect(screen.getByText("How billing works")).toBeInTheDocument();
    expect(screen.getByText("Student enrolls")).toBeInTheDocument();
  });

  it("marks a zero admission fee as disabled", () => {
    renderWithProviders(
      <StudioBillingWorkspace
        values={{ ...ownerValues, admissionFee: "0" }}
        setField={vi.fn()}
        platformFeePercent={5}
        isOwner
        isDirty={false}
        isPending={false}
        onSave={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    expect(screen.getByText("Disabled")).toBeInTheDocument();
    expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument();
  });

  it("locks owner-only fields for staff and keeps expiry editable", () => {
    renderWithProviders(
      <StudioBillingWorkspace
        values={ownerValues}
        setField={vi.fn()}
        platformFeePercent={5}
        isOwner={false}
        isDirty={false}
        isPending={false}
        onSave={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("textbox", { name: "Due days" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Expiry alert" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: "Studio timezone" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Managed by Classa")).toBeInTheDocument();
    expect(screen.getByText("%")).toBeInTheDocument();
  });

  it("shows inline validation after an invalid save attempt", () => {
    const invalid = {
      graceDays: "40",
      expireAlertDays: "120",
      timezone: "Nope",
      admissionFee: "-5",
    };
    renderWithProviders(
      <StudioBillingWorkspace
        values={invalid}
        setField={vi.fn()}
        platformFeePercent={5}
        isOwner
        isDirty
        isPending={false}
        showErrors
        errors={billingFieldErrors(invalid, { isOwner: true })}
        onSave={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Must be between 0 and 30 days."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Must be between 0 and 90 days."),
    ).toBeInTheDocument();
    expect(screen.getByText("Enter a valid amount.")).toBeInTheDocument();
    expect(
      screen.getByText("Choose a valid studio timezone."),
    ).toBeInTheDocument();
  });

  it("shows the leave confirmation when navigating away dirty", () => {
    const onStay = vi.fn();
    const onLeave = vi.fn();
    renderWithProviders(
      <StudioBillingWorkspace
        values={ownerValues}
        setField={vi.fn()}
        platformFeePercent={5}
        isOwner
        isDirty
        isPending={false}
        onSave={vi.fn()}
        onDiscard={vi.fn()}
        leaveOpen
        onStay={onStay}
        onLeaveWithoutSaving={onLeave}
      />,
    );

    expect(
      screen.getByRole("dialog", { name: "Unsaved changes" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Stay" }));
    expect(onStay).toHaveBeenCalled();
  });
});
