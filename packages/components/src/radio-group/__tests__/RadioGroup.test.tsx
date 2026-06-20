import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Radio, RadioControl, RadioGroup, RadioIndicator } from "../RadioGroup";

describe("RadioGroup", () => {
  it("renders a radiogroup with options", () => {
    render(
      <RadioGroup label="Plan">
        <Radio value="free">Free</Radio>
        <Radio value="pro">Pro</Radio>
      </RadioGroup>,
    );
    expect(screen.getByRole("radiogroup")).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(2);
  });

  it("selects a radio option", () => {
    render(
      <RadioGroup label="Plan">
        <Radio value="free">Free</Radio>
        <Radio value="pro">Pro</Radio>
      </RadioGroup>,
    );
    const pro = screen.getByRole("radio", { name: "Pro" });
    fireEvent.click(pro);
    expect(pro).toBeChecked();
  });

  it("renders without a group label", () => {
    render(
      <RadioGroup aria-label="Plan">
        <Radio value="free">Free</Radio>
      </RadioGroup>,
    );

    expect(screen.getByRole("radiogroup")).toBeInTheDocument();
    expect(screen.queryByText("Plan")).not.toBeInTheDocument();
  });

  it("renders control-only radio without children", () => {
    render(
      <RadioGroup label="Plan">
        <Radio value="free" aria-label="Free tier" />
      </RadioGroup>,
    );

    expect(
      screen.getByRole("radio", { name: "Free tier" }),
    ).toBeInTheDocument();
  });

  it("renders description and error message", () => {
    render(
      <RadioGroup
        label="Plan"
        description="Choose one plan"
        errorMessage="Selection required"
        isInvalid
      >
        <Radio value="free">Free</Radio>
      </RadioGroup>,
    );

    expect(screen.getByText("Choose one plan")).toBeInTheDocument();
    expect(screen.getByText("Selection required")).toBeInTheDocument();
  });

  it("ignores function error messages", () => {
    render(
      <RadioGroup label="Plan" errorMessage={() => "Dynamic error"} isInvalid>
        <Radio value="free">Free</Radio>
      </RadioGroup>,
    );

    expect(screen.queryByText("Dynamic error")).not.toBeInTheDocument();
  });

  it("renders compound radio children", () => {
    render(
      <RadioGroup label="Plan">
        <Radio value="free">
          <RadioControl value="free" aria-label="Free tier" />
        </Radio>
      </RadioGroup>,
    );

    expect(
      screen.getByRole("radio", { name: "Free tier" }),
    ).toBeInTheDocument();
  });

  it("reflects disabled, invalid, hover, and focus-visible states", () => {
    render(
      <RadioGroup label="Plan" isInvalid>
        <Radio value="free">Free</Radio>
      </RadioGroup>,
    );

    const control = document.querySelector("[data-radio-control]")!;
    const indicator = control.querySelector("[data-invalid='true']");
    expect(indicator).toBeTruthy();

    fireEvent.pointerEnter(control, { pointerType: "mouse" });
    expect(control.querySelector("[data-hovered='true']")).toBeTruthy();

    act(() => {
      screen.getByRole("radio", { name: "Free" }).focus();
    });
    fireEvent.keyDown(screen.getByRole("radio", { name: "Free" }), {
      key: "Tab",
    });
    expect(control.querySelector("[data-focus-visible='true']")).toBeTruthy();
  });

  it("marks disabled radios and skips hover feedback", () => {
    render(
      <RadioGroup label="Plan">
        <Radio value="free" isDisabled>
          Free
        </Radio>
      </RadioGroup>,
    );

    const control = document.querySelector("[data-radio-control]")!;

    expect(control).toHaveAttribute("data-disabled", "true");
    fireEvent.pointerEnter(control, { pointerType: "mouse" });
    expect(control.querySelector("[data-hovered='true']")).toBeNull();
  });

  it("marks group-level disabled state on radios", () => {
    render(
      <RadioGroup label="Plan" isDisabled>
        <Radio value="free">Free</Radio>
      </RadioGroup>,
    );

    expect(document.querySelector("[data-radio-control]")).toHaveAttribute(
      "data-disabled",
      "true",
    );
  });

  it("throws when RadioControl is used outside RadioGroup", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() =>
      render(<RadioControl value="free" aria-label="Free" />),
    ).toThrow("RadioControl must be used within RadioGroup");

    consoleError.mockRestore();
  });

  it("throws when RadioIndicator is used outside RadioControl", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<RadioIndicator />)).toThrow(
      "RadioIndicator must be used within RadioControl",
    );

    consoleError.mockRestore();
  });
});
