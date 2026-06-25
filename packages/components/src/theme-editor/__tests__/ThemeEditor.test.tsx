import "@testing-library/jest-dom/vitest";
import {
  createThemeDraft,
  setTokenOverride,
  type ThemeDraft,
} from "@dev-ui/tokens";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeEditor } from "../ThemeEditor";

const PREVIEW_STYLE_ID = "dev-ui-theme-editor-preview";
const LIVE_STYLE_ID = "dev-ui-theme-editor-live";

function resetThemeEditorDom() {
  document.getElementById(PREVIEW_STYLE_ID)?.remove();
  document.getElementById(LIVE_STYLE_ID)?.remove();
  document.documentElement.removeAttribute("data-theme");
}

function ControlledThemeEditor({
  initialValue,
  onChange = vi.fn(),
}: {
  initialValue: ThemeDraft;
  onChange?: (value: ThemeDraft) => void;
}) {
  const [value, setValue] = useState(initialValue);

  return (
    <ThemeEditor
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

function expandSection(name: RegExp) {
  fireEvent.click(screen.getByRole("button", { name }));
}

describe("ThemeEditor", () => {
  afterEach(() => {
    resetThemeEditorDom();
  });

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

    expandSection(/Interaction/);

    expect(
      screen.getByLabelText("interaction-hover-scale value"),
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

  it("updates color seeds", () => {
    const onChange = vi.fn();
    render(
      <ThemeEditor
        value={createThemeDraft({ label: "Acme" })}
        onChange={onChange}
      />,
    );

    const accentHex = screen.getAllByRole("textbox", { name: "Hex" })[1]!;
    fireEvent.change(accentHex, { target: { value: "#123456" } });
    fireEvent.blur(accentHex);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        color: expect.objectContaining({
          seeds: expect.objectContaining({ accent: "#123456" }),
        }),
      }),
    );
  });

  it("updates and clears foundation radius factor", () => {
    const onChange = vi.fn();
    render(
      <ThemeEditor
        value={createThemeDraft({ label: "Acme", radiusFactor: 1 })}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Radius factor"), {
      target: { value: "1.25" },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ radiusFactor: 1.25 }),
    );

    fireEvent.change(screen.getByLabelText("Radius factor"), {
      target: { value: "not-a-number" },
    });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.not.objectContaining({ radiusFactor: expect.anything() }),
    );
  });

  it("edits token overrides", () => {
    const onChange = vi.fn();

    render(
      <ThemeEditor
        value={createThemeDraft({ label: "Acme" })}
        onChange={onChange}
      />,
    );
    expandSection(/Interaction/);

    const tokenInput = screen.getByLabelText("interaction-hover-scale value");
    fireEvent.change(tokenInput, { target: { value: "1.1" } });

    const nextDraft = onChange.mock.calls.at(-1)?.[0];
    expect(
      nextDraft?.tokenOverrides.interaction?.["interaction-hover-scale"]?.target
        .value,
    ).toBe("1.1");
  });

  it("resets token overrides", () => {
    const onChange = vi.fn();
    const draft = setTokenOverride(
      createThemeDraft({ label: "Acme" }),
      "interaction",
      "interaction-hover-scale",
      "1.05",
    );

    render(<ThemeEditor value={draft} onChange={onChange} />);
    expandSection(/Interaction/);

    fireEvent.click(
      screen.getByRole("button", { name: "Reset interaction-hover-scale" }),
    );

    const nextDraft = onChange.mock.calls.at(-1)?.[0];
    expect(
      nextDraft?.tokenOverrides.interaction?.["interaction-hover-scale"],
    ).toBeUndefined();
  });

  it("clears token overrides when the input is emptied on blur", () => {
    const onChange = vi.fn();
    const draft = setTokenOverride(
      createThemeDraft({ label: "Acme" }),
      "interaction",
      "interaction-hover-scale",
      "1.05",
    );

    render(<ControlledThemeEditor initialValue={draft} onChange={onChange} />);
    expandSection(/Interaction/);

    const tokenInput = screen.getByLabelText("interaction-hover-scale value");
    fireEvent.blur(tokenInput, { target: { value: "   " } });

    const nextDraft = onChange.mock.calls.at(-1)?.[0];
    expect(
      nextDraft?.tokenOverrides.interaction?.["interaction-hover-scale"],
    ).toBeUndefined();
  });

  it("ignores empty token input changes until blur", () => {
    const onChange = vi.fn();

    render(
      <ControlledThemeEditor
        initialValue={createThemeDraft({ label: "Acme" })}
        onChange={onChange}
      />,
    );
    expandSection(/Interaction/);

    const tokenInput = screen.getByLabelText("interaction-hover-scale value");
    onChange.mockClear();
    fireEvent.change(tokenInput, { target: { value: "" } });

    expect(onChange).not.toHaveBeenCalled();
  });

  it("renders layer previews for collapsed token sections", () => {
    render(
      <ThemeEditor
        value={createThemeDraft({ label: "Acme" })}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Color preview")).toBeInTheDocument();
    expect(screen.getByLabelText("Foundation preview")).toBeInTheDocument();

    expandSection(/Semantic/);
    expect(screen.getByLabelText("Semantic preview")).toBeInTheDocument();

    expandSection(/Effects/);
    expect(screen.getByLabelText("Effects preview")).toBeInTheDocument();

    expandSection(/Components/);
    expect(screen.getByLabelText("Components preview")).toBeInTheDocument();
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
