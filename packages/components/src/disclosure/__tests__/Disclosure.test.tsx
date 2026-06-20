import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Accordion } from "../../accordion/Accordion";
import { Disclosure, DisclosurePanel, DisclosureTrigger } from "../Disclosure";

describe("Disclosure", () => {
  it("toggles panel visibility", () => {
    render(
      <Disclosure>
        <DisclosureTrigger>System Requirements</DisclosureTrigger>
        <DisclosurePanel>Details about requirements.</DisclosurePanel>
      </Disclosure>,
    );

    const panel = screen.getByText("Details about requirements.");
    expect(panel).not.toBeVisible();
    fireEvent.click(
      screen.getByRole("button", { name: "System Requirements" }),
    );
    expect(panel).toBeVisible();
  });

  it("marks expanded and hidden panel states", () => {
    render(
      <Disclosure defaultExpanded>
        <DisclosureTrigger>System Requirements</DisclosureTrigger>
        <DisclosurePanel>Details about requirements.</DisclosurePanel>
      </Disclosure>,
    );

    expect(document.querySelector("[data-disclosure]")).toHaveAttribute(
      "data-expanded",
      "true",
    );
    expect(
      document.querySelector("[data-disclosure-panel]"),
    ).not.toHaveAttribute("data-hidden");
  });

  it("reflects disabled state on the trigger", () => {
    render(
      <Disclosure isDisabled>
        <DisclosureTrigger>System Requirements</DisclosureTrigger>
        <DisclosurePanel>Details about requirements.</DisclosurePanel>
      </Disclosure>,
    );

    const trigger = screen.getByRole("button", { name: "System Requirements" });
    expect(trigger).toHaveAttribute("data-disabled", "true");
  });

  it("reflects focus-visible state on the trigger", () => {
    render(
      <Disclosure>
        <DisclosureTrigger>System Requirements</DisclosureTrigger>
        <DisclosurePanel>Details about requirements.</DisclosurePanel>
      </Disclosure>,
    );

    const trigger = screen.getByRole("button", { name: "System Requirements" });

    act(() => {
      trigger.focus();
    });
    fireEvent.keyDown(trigger, { key: "Tab" });
    expect(trigger).toHaveAttribute("data-focus-visible", "true");
  });

  it("calls onExpandedChange when toggled", () => {
    const onExpandedChange = vi.fn();

    render(
      <Disclosure onExpandedChange={onExpandedChange}>
        <DisclosureTrigger>System Requirements</DisclosureTrigger>
        <DisclosurePanel>Details about requirements.</DisclosurePanel>
      </Disclosure>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "System Requirements" }),
    );
    expect(onExpandedChange).toHaveBeenCalledWith(true);
  });

  it("syncs expansion state inside an accordion", () => {
    render(
      <Accordion>
        <Disclosure id="one">
          <DisclosureTrigger>Section one</DisclosureTrigger>
          <DisclosurePanel>Panel one</DisclosurePanel>
        </Disclosure>
      </Accordion>,
    );

    expect(screen.getByText("Panel one")).not.toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Section one" }));
    expect(screen.getByText("Panel one")).toBeVisible();
  });

  it("throws when DisclosureTrigger is used outside Disclosure", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() =>
      render(<DisclosureTrigger>Trigger</DisclosureTrigger>),
    ).toThrow("DisclosureTrigger must be used within Disclosure");

    consoleError.mockRestore();
  });

  it("throws when DisclosurePanel is used outside Disclosure", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<DisclosurePanel>Panel</DisclosurePanel>)).toThrow(
      "DisclosurePanel must be used within Disclosure",
    );

    consoleError.mockRestore();
  });
});
