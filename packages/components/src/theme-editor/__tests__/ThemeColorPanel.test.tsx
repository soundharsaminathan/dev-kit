import "@testing-library/jest-dom/vitest";
import { createThemeDraft } from "@dev-ui/tokens";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeColorPanel } from "../ThemeColorPanel";

describe("ThemeColorPanel", () => {
  it("edits the brand seed from a preset", () => {
    const onChange = vi.fn();
    render(
      <ThemeColorPanel
        value={createThemeDraft({ label: "Acme" })}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Use #14b8a6" }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        color: expect.objectContaining({
          seeds: expect.objectContaining({ accent: "#14b8a6" }),
        }),
      }),
    );
  });

  it("switches the edited color slot", () => {
    const onChange = vi.fn();
    render(
      <ThemeColorPanel
        value={createThemeDraft({ label: "Acme" })}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: /Danger/ }));
    expect(screen.getByRole("radio", { name: /Danger/ })).toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "Use #b91c1c" }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        color: expect.objectContaining({
          seeds: expect.objectContaining({ danger: "#b91c1c" }),
        }),
      }),
    );
  });

  it("exposes the slots as a single radio group", () => {
    render(
      <ThemeColorPanel
        value={createThemeDraft({ label: "Acme" })}
        onChange={vi.fn()}
      />,
    );

    const slots = screen.getAllByRole("radio");
    expect(slots).toHaveLength(6);
    expect(new Set(slots.map((slot) => slot.getAttribute("name"))).size).toBe(
      1,
    );
  });

  it("shows the hex value and generated ramps for the active slot", () => {
    render(
      <ThemeColorPanel
        value={createThemeDraft({ label: "Acme" })}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText("#438CD6")).toBeInTheDocument();
    expect(screen.getByTitle("Light 500")).toBeInTheDocument();
    expect(screen.getByTitle("Dark 500")).toBeInTheDocument();
  });

  it("keeps editing usable when a seed is not a valid color", () => {
    const draft = createThemeDraft({ label: "Acme" });
    render(
      <ThemeColorPanel
        value={{
          ...draft,
          color: {
            ...draft.color,
            seeds: { ...draft.color.seeds, accent: "" },
          },
        }}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("radio", { name: /Brand/ })).toBeChecked();
  });
});
