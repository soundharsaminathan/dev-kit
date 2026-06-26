import "@testing-library/jest-dom/vitest";
import {
  createThemeDraft,
  resolveThemeDraft,
  setTokenOverride,
} from "@dev-ui/tokens";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TokenLayerPanel } from "../TokenLayerPanel";

describe("TokenLayerPanel", () => {
  it("returns null when tokenCount is zero", () => {
    const draft = createThemeDraft({ label: "Acme" });
    const resolved = resolveThemeDraft(draft);
    const { container } = render(
      <TokenLayerPanel
        draft={draft}
        resolved={resolved}
        layer="foundation"
        label="Foundation"
        tokenCount={0}
        onTokenChange={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("edits and resets token overrides", () => {
    const draft = createThemeDraft({ label: "Acme" });
    const resolved = resolveThemeDraft(draft);
    const onTokenChange = vi.fn();

    render(
      <TokenLayerPanel
        draft={draft}
        resolved={resolved}
        layer="foundation"
        label="Foundation"
        tokenCount={3}
        onTokenChange={onTokenChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Foundation/ }));

    const radiusInput = screen.getByLabelText("radius-sm value");
    expect(radiusInput).toBeInTheDocument();

    fireEvent.change(radiusInput, { target: { value: "0.5rem" } });
    expect(onTokenChange).toHaveBeenCalledWith(
      "foundation",
      "radius-sm",
      "0.5rem",
      expect.any(String),
    );

    onTokenChange.mockClear();
    fireEvent.change(radiusInput, { target: { value: "" } });
    expect(onTokenChange).not.toHaveBeenCalled();

    fireEvent.blur(radiusInput);
    expect(onTokenChange).toHaveBeenCalledWith(
      "foundation",
      "radius-sm",
      null,
      expect.any(String),
    );
  });

  it("shows reset for overridden tokens", () => {
    const draft = setTokenOverride(
      createThemeDraft({ label: "Acme" }),
      "foundation",
      "radius-sm",
      "0.75rem",
    );
    const resolved = resolveThemeDraft(draft);
    const onTokenChange = vi.fn();

    render(
      <TokenLayerPanel
        draft={draft}
        resolved={resolved}
        layer="foundation"
        label="Foundation"
        tokenCount={3}
        onTokenChange={onTokenChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Foundation/ }));

    fireEvent.click(screen.getByRole("button", { name: "Reset radius-sm" }));
    expect(onTokenChange).toHaveBeenCalledWith(
      "foundation",
      "radius-sm",
      null,
      expect.any(String),
    );
  });
});
