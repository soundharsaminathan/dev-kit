import { createThemeDraft } from "@dev-ui/tokens";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeEditor } from "../ThemeEditor";

describe("ThemeEditor", () => {
  it("renders theme metadata and token layers", () => {
    render(
      <ThemeEditor
        value={createThemeDraft({ label: "Acme" })}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Theme name")).toHaveValue("Acme");
    expect(screen.getByText("Color")).toBeInTheDocument();
    expect(screen.getByText("Foundation")).toBeInTheDocument();
    expect(screen.getByText("Interaction")).toBeInTheDocument();
    expect(screen.getByText("Components")).toBeInTheDocument();
  });
});
