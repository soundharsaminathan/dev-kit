import { createThemeDraft } from "@dev-ui/tokens";
import { fireEvent, render, screen } from "@testing-library/react";
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

  it("defers collapsed token layer inputs until the section is expanded", () => {
    render(
      <ThemeEditor
        value={createThemeDraft({ label: "Acme" })}
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.queryByLabelText("interaction-hover-scale value"),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Interaction/ }));

    expect(
      screen.getByLabelText("interaction-hover-scale value"),
    ).toBeInTheDocument();
  });
});
