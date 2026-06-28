import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
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

    const searchbox = screen.getByRole("searchbox");
    act(() => {
      searchbox.focus();
    });

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

  it("hides the menu until the autocomplete is focused", () => {
    const { container } = render(
      <Autocomplete aria-label="Commands">
        <AutocompleteInput aria-label="Search" />
        <AutocompleteContent aria-label="Results" selectionMode="none">
          <AutocompleteItem id="calendar">Calendar</AutocompleteItem>
        </AutocompleteContent>
      </Autocomplete>,
    );

    const listbox = container.querySelector("[data-listbox='']");
    expect(listbox).toHaveStyle({ opacity: "0", visibility: "hidden" });

    const searchbox = screen.getByRole("searchbox");
    act(() => {
      searchbox.focus();
    });
    expect(container.querySelector("[data-autocomplete='']")).toHaveAttribute(
      "data-focus-within",
      "true",
    );
    expect(listbox).toHaveStyle({ opacity: "1", visibility: "visible" });
  });

  it("shows all options again when the query is cleared", () => {
    render(
      <Autocomplete aria-label="Commands">
        <AutocompleteInput aria-label="Search" />
        <AutocompleteContent aria-label="Results" selectionMode="none">
          <AutocompleteItem id="calendar">Calendar</AutocompleteItem>
          <AutocompleteItem id="settings">Settings</AutocompleteItem>
        </AutocompleteContent>
      </Autocomplete>,
    );

    const searchbox = screen.getByRole("searchbox");
    act(() => {
      searchbox.focus();
    });

    fireEvent.change(searchbox, { target: { value: "cal" } });
    expect(
      screen.queryByRole("option", { name: "Settings" }),
    ).not.toBeInTheDocument();

    fireEvent.change(searchbox, { target: { value: "" } });
    expect(
      screen.getByRole("option", { name: "Settings" }),
    ).toBeInTheDocument();
  });

  it("accepts custom filter options", () => {
    render(
      <Autocomplete
        aria-label="Commands"
        filter={{ sensitivity: "base", ignorePunctuation: false }}
      >
        <AutocompleteInput aria-label="Search" />
        <AutocompleteContent aria-label="Results" selectionMode="none">
          <AutocompleteItem id="calendar">Calendar</AutocompleteItem>
        </AutocompleteContent>
      </Autocomplete>,
    );

    expect(screen.getByRole("searchbox")).toBeInTheDocument();
  });
});
