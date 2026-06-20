import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InputGroup, InputGroupAddon } from "../../input-group/InputGroup";
import type { CollectionItem } from "../../list-box/collection-utils";
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxItem,
  ComboboxPopover,
  ComboboxValue,
} from "../Combobox";

const countryItems: CollectionItem[] = [
  { id: "us", label: "United States" },
  { id: "ca", label: "Canada" },
  { id: "mx", label: "Mexico", isDisabled: true },
];

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" width={16} height={16}>
      <path d="M6 9l6 6 6-6" fill="currentColor" />
    </svg>
  );
}

type RenderComboboxOptions = {
  menuTrigger?: "focus" | "input" | "manual";
  isDisabled?: boolean;
  items?: CollectionItem[];
  label?: string;
  description?: string;
  errorMessage?: string;
  isInvalid?: boolean;
};

function renderCombobox({
  menuTrigger = "focus",
  isDisabled,
  items,
  label,
  description,
  errorMessage,
  isInvalid,
}: RenderComboboxOptions = {}) {
  render(
    <Combobox
      aria-label="Country"
      menuTrigger={menuTrigger}
      {...(isDisabled !== undefined ? { isDisabled } : {})}
      {...(items !== undefined ? { items } : {})}
      {...(label !== undefined ? { label } : {})}
      {...(description !== undefined ? { description } : {})}
      {...(errorMessage !== undefined ? { errorMessage } : {})}
      {...(isInvalid !== undefined ? { isInvalid } : {})}
    >
      <InputGroup>
        <ComboboxInput placeholder="Search countries" />
        <InputGroupAddon>
          <ComboboxButton aria-label="Show suggestions">
            <ChevronDownIcon />
          </ComboboxButton>
        </InputGroupAddon>
      </InputGroup>
      <ComboboxPopover>
        <ComboboxItem id="us">United States</ComboboxItem>
        <ComboboxItem id="ca">Canada</ComboboxItem>
        <ComboboxItem id="mx" isDisabled>
          Mexico
        </ComboboxItem>
      </ComboboxPopover>
    </Combobox>,
  );
}

function openCombobox() {
  act(() => {
    screen.getByRole("combobox").focus();
  });
}

describe("Combobox", () => {
  it("renders a combobox input", () => {
    renderCombobox();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search countries")).toBeInTheDocument();
  });

  it("opens the listbox when the input is focused", () => {
    renderCombobox();

    openCombobox();

    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "United States" }),
    ).toBeInTheDocument();
  });

  it("opens the listbox when the toggle button is clicked with manual trigger", () => {
    renderCombobox({ menuTrigger: "manual" });

    fireEvent.click(screen.getByRole("button", { name: "Show suggestions" }));

    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("selects an item and closes the listbox", () => {
    renderCombobox();

    openCombobox();
    fireEvent.click(screen.getByRole("option", { name: "Canada" }));

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveValue("Canada");
  });

  it("renders options from the items prop", () => {
    renderCombobox({ items: countryItems });

    openCombobox();

    expect(
      screen.getByRole("option", { name: "United States" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Canada" })).toBeInTheDocument();
  });

  it("marks disabled options", () => {
    renderCombobox();

    openCombobox();

    expect(screen.getByRole("option", { name: "Mexico" })).toHaveAttribute(
      "data-disabled",
      "true",
    );
  });

  it("renders without collection items when no popover is provided", () => {
    render(
      <Combobox aria-label="Country">
        <InputGroup>
          <ComboboxInput placeholder="Search" />
        </InputGroup>
      </Combobox>,
    );

    openCombobox();

    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("skips rendering when errorMessage is a function", () => {
    render(
      <Combobox
        aria-label="Country"
        isInvalid
        errorMessage={() => "Country is required"}
      >
        <InputGroup>
          <ComboboxInput />
        </InputGroup>
        <ComboboxPopover>
          <ComboboxItem id="us">United States</ComboboxItem>
        </ComboboxPopover>
      </Combobox>,
    );

    expect(screen.queryByText("Country is required")).not.toBeInTheDocument();
  });

  it("renders the popover with a custom placement", () => {
    render(
      <Combobox aria-label="Country">
        <InputGroup>
          <ComboboxInput />
        </InputGroup>
        <ComboboxPopover placement="top">
          <ComboboxItem id="us">United States</ComboboxItem>
        </ComboboxPopover>
      </Combobox>,
    );

    openCombobox();

    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("renders label, description, and error message", () => {
    renderCombobox({
      label: "Country",
      description: "Choose your country",
      errorMessage: "Country is required",
      isInvalid: true,
    });

    expect(screen.getByText("Country")).toBeInTheDocument();
    expect(screen.getByText("Choose your country")).toBeInTheDocument();
    expect(screen.getByText("Country is required")).toBeInTheDocument();
  });

  it("renders ComboboxValue", () => {
    render(
      <Combobox aria-label="Country">
        <ComboboxValue>Selected value</ComboboxValue>
        <InputGroup>
          <ComboboxInput />
        </InputGroup>
        <ComboboxPopover>
          <ComboboxItem id="us">United States</ComboboxItem>
        </ComboboxPopover>
      </Combobox>,
    );

    expect(screen.getByText("Selected value")).toHaveAttribute(
      "data-combobox-value",
      "",
    );
  });

  it("disables the input and button when isDisabled is set", () => {
    renderCombobox({ isDisabled: true });

    expect(screen.getByRole("combobox")).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Show suggestions" }),
    ).toBeDisabled();
  });

  it("does not render the popover when closed", () => {
    renderCombobox({ menuTrigger: "manual" });

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("throws when ComboboxInput is used outside Combobox", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<ComboboxInput aria-label="Country" />)).toThrow(
      "ComboboxInput must be used within Combobox",
    );

    consoleError.mockRestore();
  });

  it("throws when ComboboxPopover is used outside Combobox", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() =>
      render(
        <ComboboxPopover>
          <ComboboxItem id="us">United States</ComboboxItem>
        </ComboboxPopover>,
      ),
    ).toThrow("ComboboxPopover must be used within Combobox");

    consoleError.mockRestore();
  });

  it("throws when ComboboxButton is used outside Combobox", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() =>
      render(<ComboboxButton aria-label="Toggle">Open</ComboboxButton>),
    ).toThrow("ComboboxButton must be used within Combobox");

    consoleError.mockRestore();
  });
});
