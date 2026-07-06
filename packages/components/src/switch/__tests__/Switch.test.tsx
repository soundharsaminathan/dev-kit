import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Switch, SwitchControl, SwitchIndicator, SwitchThumb } from "../Switch";

describe("Switch", () => {
  it("renders a switch", () => {
    render(<Switch aria-label="Notifications" />);
    expect(screen.getByRole("switch")).toBeInTheDocument();
  });

  it("renders with a string label", () => {
    render(<Switch>Notifications</Switch>);
    expect(screen.getByText("Notifications")).toBeInTheDocument();
  });

  it("toggles when clicked", () => {
    render(<Switch aria-label="Notifications" />);
    const toggle = screen.getByRole("switch");
    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);
    expect(toggle).toBeChecked();
  });

  it("renders compound children", () => {
    render(
      <Switch>
        <SwitchControl aria-label="Alerts" />
      </Switch>,
    );
    expect(screen.getByRole("switch", { name: "Alerts" })).toBeInTheDocument();
  });

  it("renders a standalone indicator by wrapping it in control", () => {
    render(
      <SwitchControl aria-label="Standalone">
        <SwitchIndicator />
      </SwitchControl>,
    );
    expect(
      screen.getByRole("switch", { name: "Standalone" }),
    ).toBeInTheDocument();
    expect(document.querySelector("[data-switch-control]")).toBeInTheDocument();
  });

  it("reflects selected, disabled, hover, and focus-visible states", () => {
    render(<Switch defaultSelected aria-label="Notifications" />);
    const indicator = document.querySelector("[data-switch-control]")!;

    expect(indicator.querySelector("[data-selected='true']")).toBeTruthy();

    act(() => {
      screen.getByRole("switch").focus();
    });
    fireEvent.keyDown(screen.getByRole("switch"), { key: "Tab" });
    expect(indicator.querySelector("[data-focus-visible='true']")).toBeTruthy();

    fireEvent.pointerEnter(indicator, { pointerType: "mouse" });
    expect(indicator.querySelector("[data-hovered='true']")).toBeTruthy();
  });

  it("marks disabled state on control and indicator", () => {
    render(<Switch isDisabled aria-label="Notifications" />);
    const control = document.querySelector("[data-switch-control]")!;

    expect(control).toHaveAttribute("data-disabled", "true");
    expect(control.querySelector("[data-disabled='true']")).toBeTruthy();
  });

  it("does not reflect hover when disabled", () => {
    render(<Switch isDisabled aria-label="Notifications" />);
    const control = document.querySelector("[data-switch-control]")!;

    fireEvent.pointerEnter(control, { pointerType: "mouse" });

    expect(control.querySelector("[data-hovered='true']")).toBeNull();
  });

  it("applies explicit indicator size", () => {
    render(
      <Switch>
        <SwitchControl aria-label="Notifications">
          <SwitchIndicator size="sm" />
        </SwitchControl>
      </Switch>,
    );

    expect(document.querySelector("[data-size='sm']")).toBeTruthy();
  });

  it("applies size to the indicator", () => {
    render(<Switch size="lg" aria-label="Notifications" />);
    expect(document.querySelector("[data-size='lg']")).toBeTruthy();
  });

  it("renders custom indicator and thumb content", () => {
    render(
      <Switch>
        <SwitchControl aria-label="Notifications">
          <SwitchIndicator className="custom-indicator">
            <SwitchThumb className="custom-thumb" />
          </SwitchIndicator>
        </SwitchControl>
      </Switch>,
    );

    expect(document.querySelector(".custom-indicator")).toBeTruthy();
    expect(document.querySelector(".custom-thumb")).toBeTruthy();
  });

  it("renders thumb without context when used outside control", () => {
    render(<SwitchThumb className="orphan-thumb" />);

    const thumb = document.querySelector(".orphan-thumb");
    expect(thumb).not.toHaveAttribute("data-selected");
    expect(thumb).not.toHaveAttribute("data-disabled");
  });
});
