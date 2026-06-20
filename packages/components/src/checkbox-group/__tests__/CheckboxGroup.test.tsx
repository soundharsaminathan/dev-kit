import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Checkbox } from "../../checkbox/Checkbox";
import { CheckboxGroup } from "../CheckboxGroup";

describe("CheckboxGroup", () => {
  it("renders a group with checkboxes", () => {
    render(
      <CheckboxGroup aria-label="Features">
        <Checkbox value="a">Option A</Checkbox>
        <Checkbox value="b">Option B</Checkbox>
      </CheckboxGroup>,
    );
    expect(screen.getByRole("group")).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
  });

  it("selects checkbox values in the group", () => {
    render(
      <CheckboxGroup aria-label="Features">
        <Checkbox value="a">Option A</Checkbox>
        <Checkbox value="b">Option B</Checkbox>
      </CheckboxGroup>,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Option A" }));
    expect(screen.getByRole("checkbox", { name: "Option A" })).toBeChecked();
  });
});
