import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Description, Label } from "../../field/Field";
import { Input } from "../../input/Input";
import { TextField } from "../TextField";

describe("TextField", () => {
  it("renders with text-field data attributes", () => {
    render(
      <TextField>
        <Label>Email</Label>
        <Input placeholder="you@example.com" />
      </TextField>,
    );
    const field = screen.getByText("Email").closest("[data-slot='text-field']");
    expect(field).toHaveAttribute("data-textfield", "");
  });

  it("associates label and input through field context", () => {
    render(
      <TextField>
        <Label>Email</Label>
        <Description>We never share your email.</Description>
        <Input />
      </TextField>,
    );
    const input = screen.getByRole("textbox");
    const label = screen.getByText("Email");
    expect(label).toHaveAttribute("for", input.getAttribute("id"));
  });
});
