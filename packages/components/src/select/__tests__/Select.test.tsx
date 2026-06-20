import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Label } from "../../field/Field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../Select";

const items = [
  { id: "a", label: "Option A" },
  { id: "b", label: "Option B" },
  { id: "c", label: "Option C", isDisabled: true },
];

describe("Select", () => {
  it("renders a select trigger", () => {
    render(
      <Select aria-label="Provider" placeholder="Choose">
        <SelectTrigger />
        <SelectContent>
          <SelectItem id="a">Option A</SelectItem>
          <SelectItem id="b">Option B</SelectItem>
        </SelectContent>
      </Select>,
    );
    expect(screen.getByRole("button")).toBeInTheDocument();
    expect(screen.getByText("Choose")).toBeInTheDocument();
  });

  it("opens the listbox when the trigger is clicked", () => {
    render(
      <Select aria-label="Provider" placeholder="Choose">
        <SelectTrigger />
        <SelectContent>
          <SelectItem id="a">Option A</SelectItem>
          <SelectItem id="b">Option B</SelectItem>
        </SelectContent>
      </Select>,
    );

    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Option A" }),
    ).toBeInTheDocument();
  });

  it("renders options from the items prop", () => {
    render(
      <Select aria-label="Provider" items={items} placeholder="Choose">
        <SelectTrigger />
        <SelectContent />
      </Select>,
    );

    fireEvent.click(screen.getByRole("button"));

    expect(
      screen.getByRole("option", { name: "Option A" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Option C" })).toHaveAttribute(
      "data-disabled",
      "true",
    );
  });

  it("selects an option and updates the value", () => {
    render(
      <Select aria-label="Provider" items={items} placeholder="Choose">
        <SelectTrigger />
        <SelectContent />
      </Select>,
    );

    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByRole("option", { name: "Option B" }));

    expect(screen.getByRole("button")).toHaveTextContent("Option B");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("renders label, description, and error message", () => {
    render(
      <Select
        aria-label="Provider"
        label="Provider"
        description="Choose a provider"
        errorMessage="Required"
        items={items}
      >
        <SelectTrigger />
        <SelectContent />
      </Select>,
    );

    expect(screen.getByText("Choose a provider")).toBeInTheDocument();
    expect(screen.getByText("Required")).toBeInTheDocument();
    expect(
      document.querySelector("[data-select-trigger='']"),
    ).toBeInTheDocument();
  });

  it("supports custom trigger and value content", () => {
    render(
      <Select aria-label="Provider" items={items} selectedKey="a">
        <SelectTrigger>
          <SelectValue placeholder="Pick one" />
        </SelectTrigger>
        <SelectContent />
      </Select>,
    );

    expect(
      document.querySelector("[data-slot='select-value']"),
    ).toHaveTextContent("Option A");
  });

  it("marks disabled state on the trigger", () => {
    render(
      <Select aria-label="Provider" isDisabled items={items}>
        <SelectTrigger />
        <SelectContent />
      </Select>,
    );

    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("labels the listbox from a Label child", () => {
    render(
      <Select placeholder="Choose">
        <Label>Provider</Label>
        <SelectTrigger />
        <SelectContent>
          <SelectItem id="a">Option A</SelectItem>
        </SelectContent>
      </Select>,
    );

    fireEvent.click(screen.getByRole("button"));

    expect(
      screen.getByRole("listbox", { name: "Provider" }),
    ).toBeInTheDocument();
  });

  it("throws when subcomponents are rendered outside Select", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<SelectTrigger />)).toThrow(
      "SelectTrigger must be used within Select",
    );
    expect(() => render(<SelectValue />)).toThrow(
      "SelectValue must be used within Select",
    );
    expect(() => render(<SelectContent />)).toThrow(
      "SelectContent must be used within Select",
    );

    consoleError.mockRestore();
  });
});
