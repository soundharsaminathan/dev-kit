import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteInput,
  AutocompleteItem,
} from "../index";

describe("Autocomplete", () => {
  it("renders with data-autocomplete attribute", () => {
    const { container } = render(
      <Autocomplete aria-label="Commands">
        <AutocompleteInput aria-label="Search" placeholder="Search..." />
        <AutocompleteContent aria-label="Results">
          <AutocompleteItem id="one">One</AutocompleteItem>
        </AutocompleteContent>
      </Autocomplete>,
    );

    expect(
      container.querySelector("[data-autocomplete='']"),
    ).toBeInTheDocument();
  });

  it("applies style variant data attribute", () => {
    const { container } = render(
      <Autocomplete aria-label="Commands" variant="borderless">
        <AutocompleteInput aria-label="Search" />
      </Autocomplete>,
    );

    expect(container.querySelector("[data-autocomplete='']")).toHaveAttribute(
      "data-variant",
      "borderless",
    );
  });

  it("filters list items based on search input", () => {
    render(
      <Autocomplete aria-label="Commands">
        <AutocompleteInput aria-label="Search" />
        <AutocompleteContent aria-label="Results" selectionMode="none">
          <AutocompleteItem id="calendar">Calendar</AutocompleteItem>
          <AutocompleteItem id="settings">Settings</AutocompleteItem>
        </AutocompleteContent>
      </Autocomplete>,
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
