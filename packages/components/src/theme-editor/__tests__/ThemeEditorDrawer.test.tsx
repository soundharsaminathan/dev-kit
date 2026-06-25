import { createThemeDraft } from "@dev-ui/tokens";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
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

  it("opens the drawer and renders theme fields", async () => {
    render(
      <ThemeEditorDrawer
        value={draft}
        onChange={vi.fn()}
        onLivePreview={vi.fn()}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Edit theme" }));
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Theme name")).toHaveValue("Acme");
    });
    expect(screen.getByText("Color")).toBeInTheDocument();
    expect(screen.getByText("Foundation")).toBeInTheDocument();
  });
});
