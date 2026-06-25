import { createThemeDraft } from "@dev-ui/tokens";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeEditorDrawer } from "../ThemeEditorDrawer";

const draft = createThemeDraft({ label: "Acme" });

describe("ThemeEditorDrawer", () => {
  it("renders theme fields when open", () => {
    render(
      <ThemeEditorDrawer
        defaultOpen
        value={draft}
        onChange={vi.fn()}
        onLivePreview={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Theme name")).toHaveValue("Acme");
    expect(screen.getByText("Color")).toBeInTheDocument();
    expect(screen.getByText("Foundation")).toBeInTheDocument();
  });

  it("opens the drawer from the trigger", () => {
    render(
      <ThemeEditorDrawer
        value={draft}
        onChange={vi.fn()}
        onLivePreview={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit theme" }));

    expect(screen.getByLabelText("Theme name")).toHaveValue("Acme");
    expect(screen.getByText("Color")).toBeInTheDocument();
    expect(screen.getByText("Foundation")).toBeInTheDocument();
  });
});
