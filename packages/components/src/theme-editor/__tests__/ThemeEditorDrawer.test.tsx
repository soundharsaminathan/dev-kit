import "@testing-library/jest-dom/vitest";
import { createThemeDraft } from "@dev-ui/tokens";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeEditorDrawer } from "../ThemeEditorDrawer";
import { THEME_EDITOR_LIVE_ID } from "../use-theme-editor-live-preview";

const draft = createThemeDraft({ label: "Acme" });

describe("ThemeEditorDrawer", () => {
  afterEach(() => {
    document.getElementById("dev-ui-theme-editor-live")?.remove();
    document.documentElement.removeAttribute("data-theme");
  });

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
    expect(
      screen.getByRole("button", { name: /Base style/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Color")).not.toBeInTheDocument();
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
    expect(
      screen.getByRole("button", { name: /Base style/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Color")).not.toBeInTheDocument();
  });

  it("renders a custom trigger instead of the default button", () => {
    render(
      <ThemeEditorDrawer
        value={draft}
        onChange={vi.fn()}
        onLivePreview={vi.fn()}
        trigger={<button type="button">Open custom editor</button>}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Edit theme" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open custom editor" }),
    ).toBeInTheDocument();
  });

  it("renders footer children when open", () => {
    render(
      <ThemeEditorDrawer
        defaultOpen
        value={draft}
        onChange={vi.fn()}
        onLivePreview={vi.fn()}
      >
        <p>Drawer footer content</p>
      </ThemeEditorDrawer>,
    );

    expect(screen.getByText("Drawer footer content")).toBeInTheDocument();
  });

  it("calls save and open-change handlers", () => {
    const onSave = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <ThemeEditorDrawer
        defaultOpen
        value={draft}
        onChange={vi.fn()}
        onSave={onSave}
        onOpenChange={onOpenChange}
        onLivePreview={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save theme" }));
    expect(onSave).toHaveBeenCalledWith(draft);

    fireEvent.click(screen.getByRole("button", { name: "Close theme editor" }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);

    fireEvent.click(screen.getByRole("button", { name: "Edit theme" }));
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("applies direct DOM live preview when no callback is provided", () => {
    document.documentElement.setAttribute("data-theme", "default");

    const { unmount } = render(
      <ThemeEditorDrawer defaultOpen value={draft} onChange={vi.fn()} />,
    );

    const style = document.getElementById("dev-ui-theme-editor-live");
    expect(style).toBeInTheDocument();
    expect(style?.textContent).toContain(
      `[data-theme="${THEME_EDITOR_LIVE_ID}"]`,
    );
    expect(document.documentElement.getAttribute("data-theme")).toBe(
      THEME_EDITOR_LIVE_ID,
    );

    unmount();

    expect(document.getElementById("dev-ui-theme-editor-live")).toBeNull();
    expect(document.documentElement.getAttribute("data-theme")).toBe("default");
  });

  it("respects controlled open state", () => {
    const onOpenChange = vi.fn();

    render(
      <ThemeEditorDrawer
        isOpen={false}
        value={draft}
        onChange={vi.fn()}
        onOpenChange={onOpenChange}
        onLivePreview={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText("Theme name")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit theme" }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.queryByLabelText("Theme name")).not.toBeInTheDocument();
  });
});
