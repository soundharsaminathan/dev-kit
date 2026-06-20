import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Command, CommandContent, CommandInput, CommandItem } from "../index";

describe("Command", () => {
  it("renders with data-command attribute", () => {
    const { container } = render(
      <Command aria-label="Commands">
        <CommandInput aria-label="Search" placeholder="Search..." />
        <CommandContent aria-label="Results">
          <CommandItem id="one">One</CommandItem>
        </CommandContent>
      </Command>,
    );

    expect(container.querySelector("[data-command='']")).toBeInTheDocument();
  });

  it("applies style variant data attribute", () => {
    const { container } = render(
      <Command aria-label="Commands" variant="borderless">
        <CommandInput aria-label="Search" />
      </Command>,
    );

    expect(container.querySelector("[data-command='']")).toHaveAttribute(
      "data-variant",
      "borderless",
    );
  });

  it("filters list items based on search input", () => {
    render(
      <Command aria-label="Commands">
        <CommandInput aria-label="Search" />
        <CommandContent aria-label="Results" selectionMode="none">
          <CommandItem id="calendar">Calendar</CommandItem>
          <CommandItem id="settings">Settings</CommandItem>
        </CommandContent>
      </Command>,
    );

    expect(
      screen.getByRole("option", { name: "Calendar" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Settings" }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "cal" },
    });

    expect(
      screen.getByRole("option", { name: "Calendar" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Settings" }),
    ).not.toBeInTheDocument();
  });
});
