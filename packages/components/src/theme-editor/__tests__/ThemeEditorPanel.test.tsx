import "@testing-library/jest-dom/vitest";
import { createThemeDraft } from "@dev-ui/tokens";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeEditorPanel } from "../ThemeEditorPanel";

describe("ThemeEditorPanel", () => {
  it("updates theme metadata fields", () => {
    const onChange = vi.fn();
    render(
      <ThemeEditorPanel
        value={createThemeDraft({ label: "Acme" })}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Theme name"), {
      target: { value: "Updated theme" },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ label: "Updated theme" }),
    );

    onChange.mockClear();
    fireEvent.click(screen.getByRole("button", { name: /Base style/ }));
    fireEvent.click(screen.getByRole("option", { name: "Material" }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ extends: "material" }),
    );
  });

  it("ignores falsy base style changes", () => {
    const onChange = vi.fn();
    const { container } = render(
      <ThemeEditorPanel
        value={createThemeDraft({ label: "Acme" })}
        onChange={onChange}
      />,
    );

    const select = container.querySelector(
      '[data-testid="hidden-select-container"] select',
    )!;
    fireEvent.change(select, { target: { value: "" } });

    expect(onChange).not.toHaveBeenCalled();
  });

  it("updates radius and font stacks, including clearing fonts", () => {
    const onChange = vi.fn();
    render(
      <ThemeEditorPanel
        value={createThemeDraft({
          label: "Acme",
          fonts: { sans: "Inter, sans-serif" },
        })}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Radius factor"), {
      target: { value: "1.5" },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ radiusFactor: 1.5 }),
    );

    onChange.mockClear();
    fireEvent.change(screen.getByLabelText("mono font"), {
      target: { value: "JetBrains Mono" },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        fonts: expect.objectContaining({
          sans: "Inter, sans-serif",
          mono: "JetBrains Mono",
        }),
      }),
    );

    onChange.mockClear();
    fireEvent.change(screen.getByLabelText("sans font"), {
      target: { value: "   " },
    });
    // Only sans was set on the rendered value; clearing it removes fonts entirely.
    const cleared = onChange.mock.calls.at(-1)?.[0] as {
      fonts?: Record<string, string>;
    };
    expect(cleared.fonts).toBeUndefined();
  });
});
