import "@testing-library/jest-dom/vitest";
import { createThemeDraft } from "@dev-ui/tokens";
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  draftToLiveDefinition,
  THEME_EDITOR_LIVE_ID,
  useThemeEditorLivePreview,
  useThemeEditorLivePreviewEffect,
} from "../use-theme-editor-live-preview";

const draft = createThemeDraft({ label: "Live theme" });

describe("use-theme-editor-live-preview", () => {
  afterEach(() => {
    document.getElementById("dev-ui-theme-editor-live")?.remove();
    document.documentElement.removeAttribute("data-theme");
  });

  it("builds a live theme definition from a draft", () => {
    const definition = draftToLiveDefinition(draft);

    expect(definition.id).toBe(THEME_EDITOR_LIVE_ID);
    expect(definition.label).toBe("Live theme");
  });

  it("delegates live preview updates to onLivePreview", () => {
    const onLivePreview = vi.fn();
    const { result } = renderHook(() =>
      useThemeEditorLivePreview(onLivePreview),
    );

    act(() => {
      result.current.applyLivePreview(draft);
    });

    expect(onLivePreview).toHaveBeenCalledWith(
      expect.objectContaining({ id: THEME_EDITOR_LIVE_ID }),
    );

    act(() => {
      result.current.clearLivePreview();
    });

    expect(onLivePreview).toHaveBeenLastCalledWith(null);
  });

  it("applies and clears direct DOM live preview when no callback is provided", () => {
    document.documentElement.setAttribute("data-theme", "default");

    const { result } = renderHook(() => useThemeEditorLivePreview());

    act(() => {
      result.current.applyLivePreview(draft);
    });

    const style = document.getElementById("dev-ui-theme-editor-live");
    expect(style).toBeInTheDocument();
    expect(style?.textContent).toContain(
      `[data-theme="${THEME_EDITOR_LIVE_ID}"]`,
    );
    expect(document.documentElement.getAttribute("data-theme")).toBe(
      THEME_EDITOR_LIVE_ID,
    );

    act(() => {
      result.current.clearLivePreview();
    });

    expect(document.getElementById("dev-ui-theme-editor-live")).toBeNull();
    expect(document.documentElement.getAttribute("data-theme")).toBe("default");
  });

  it("clears direct DOM live preview without restoring theme when none was set", () => {
    const { result } = renderHook(() => useThemeEditorLivePreview());

    act(() => {
      result.current.applyLivePreview(draft);
    });
    expect(document.documentElement.getAttribute("data-theme")).toBe(
      THEME_EDITOR_LIVE_ID,
    );

    document.documentElement.removeAttribute("data-theme");

    act(() => {
      result.current.clearLivePreview();
    });

    expect(document.getElementById("dev-ui-theme-editor-live")).toBeNull();
    expect(document.documentElement.getAttribute("data-theme")).toBeNull();
  });

  it("syncs live preview with drawer activity", () => {
    const onLivePreview = vi.fn();

    const { rerender } = renderHook(
      ({ isActive }: { isActive: boolean }) =>
        useThemeEditorLivePreviewEffect(draft, isActive, onLivePreview),
      { initialProps: { isActive: true } },
    );

    expect(onLivePreview).toHaveBeenCalledWith(
      expect.objectContaining({ id: THEME_EDITOR_LIVE_ID }),
    );

    rerender({ isActive: false });

    expect(onLivePreview).toHaveBeenLastCalledWith(null);
  });
});
