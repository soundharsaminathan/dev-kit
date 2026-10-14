import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { VariablePicker } from "./variable-picker";

describe("VariablePicker", () => {
  it("inserts a certificate variable", async () => {
    const onInsert = vi.fn();
    renderWithProviders(<VariablePicker onInsert={onInsert} />);

    fireEvent.click(screen.getByRole("button", { name: "Insert variable" }));
    fireEvent.click(
      await screen.findByRole("menuitemradio", { name: /Student name/i }),
    );

    expect(onInsert).toHaveBeenCalledWith("student_name");
  });

  it("disables the trigger when disabled", () => {
    renderWithProviders(<VariablePicker onInsert={vi.fn()} disabled />);
    expect(
      screen.getByRole("button", { name: "Insert variable" }),
    ).toBeDisabled();
  });
});
