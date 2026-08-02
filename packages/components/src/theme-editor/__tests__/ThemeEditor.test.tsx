import "@testing-library/jest-dom/vitest";
import { createThemeDraft } from "@dev-ui/tokens";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeEditor } from "../ThemeEditor";

const PREVIEW_STYLE_ID = "dev-ui-theme-editor-preview";

function resetThemeEditorDom() {
  document.getElementById(PREVIEW_STYLE_ID)?.remove();
  document.documentElement.removeAttribute("data-theme");
}

describe("ThemeEditor", () => {
  afterEach(() => {
    resetThemeEditorDom();
  });

  it("renders theme metadata fields", () => {
    render(
      <ThemeEditor
        value={createThemeDraft({ label: "Acme" })}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Theme name")).toHaveValue("Acme");
    expect(
      screen.getByRole("button", { name: /Base style/ }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Radius factor")).toBeInTheDocument();
    expect(screen.getByLabelText("accent color")).toBeInTheDocument();
    expect(screen.getByLabelText("sans font")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Foundation/ }),
    ).toBeInTheDocument();
  });

  it("injects preview CSS when previewThemeId is set", () => {
    const { unmount } = render(
      <ThemeEditor
        value={createThemeDraft({ label: "Acme" })}
        onChange={vi.fn()}
        previewThemeId="preview-theme"
      />,
    );

    const style = document.getElementById(PREVIEW_STYLE_ID);
    expect(style).toBeInTheDocument();
    expect(style?.textContent).toContain('[data-theme="preview-theme"]');

    unmount();

    expect(document.getElementById(PREVIEW_STYLE_ID)).toBeNull();
  });

  it("updates the theme name", () => {
    const onChange = vi.fn();
    render(
      <ThemeEditor
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
  });

  it("updates the base style", () => {
    const onChange = vi.fn();
    render(
      <ThemeEditor
        value={createThemeDraft({ label: "Acme" })}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Base style/ }));
    fireEvent.click(screen.getByRole("option", { name: "Material" }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ extends: "material" }),
    );
  });

  it("renders children and applies className", () => {
    const { container } = render(
      <ThemeEditor
        value={createThemeDraft({ label: "Acme" })}
        onChange={vi.fn()}
        className="custom-editor"
      >
        <p>Extra panel content</p>
      </ThemeEditor>,
    );

    expect(screen.getByText("Extra panel content")).toBeInTheDocument();
    expect(container.firstChild).toHaveClass("custom-editor");
  });
});
