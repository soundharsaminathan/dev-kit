import { createThemeDraft } from "@dev-ui/tokens";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeEditorDrawer } from "../ThemeEditorDrawer";

describe("ThemeEditorDrawer", () => {
  it("opens the drawer and renders theme fields", () => {
    render(
      <ThemeEditorDrawer
        value={createThemeDraft({ label: "Acme" })}
        onChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit theme" }));

    expect(screen.getByLabelText("Theme name")).toHaveValue("Acme");
    expect(screen.getByText("Color")).toBeInTheDocument();
    expect(screen.getByText("Foundation")).toBeInTheDocument();
  });
});
