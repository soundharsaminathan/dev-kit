import { fireEvent, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useKeyboardShortcut } from "../use-keyboard-shortcut";

describe("useKeyboardShortcut", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls onPress when the shortcut matches", () => {
    const onPress = vi.fn();
    renderHook(() => useKeyboardShortcut({ key: "k", metaKey: true, onPress }));

    fireEvent.keyDown(window, { key: "k", metaKey: true });

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("accepts ctrlKey as a meta modifier", () => {
    const onPress = vi.fn();
    renderHook(() => useKeyboardShortcut({ key: "k", metaKey: true, onPress }));

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("ignores shortcuts when disabled", () => {
    const onPress = vi.fn();
    renderHook(() =>
      useKeyboardShortcut({
        key: "k",
        metaKey: true,
        enabled: false,
        onPress,
      }),
    );

    fireEvent.keyDown(window, { key: "k", metaKey: true });

    expect(onPress).not.toHaveBeenCalled();
  });

  it("ignores mismatched keys and modifiers", () => {
    const onPress = vi.fn();
    renderHook(() => useKeyboardShortcut({ key: "k", metaKey: true, onPress }));

    fireEvent.keyDown(window, { key: "j", metaKey: true });
    fireEvent.keyDown(window, { key: "k" });

    expect(onPress).not.toHaveBeenCalled();
  });

  it("fires without meta when metaKey is false", () => {
    const onPress = vi.fn();
    renderHook(() =>
      useKeyboardShortcut({ key: "Escape", metaKey: false, onPress }),
    );

    fireEvent.keyDown(window, { key: "Escape" });

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("skips input targets when ignoreInputFocus is true", () => {
    const onPress = vi.fn();
    renderHook(() =>
      useKeyboardShortcut({
        key: "k",
        metaKey: true,
        ignoreInputFocus: true,
        onPress,
      }),
    );

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    fireEvent.keyDown(input, { key: "k", metaKey: true, bubbles: true });

    expect(onPress).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it("allows shortcuts in inputs when ignoreInputFocus is false", () => {
    const onPress = vi.fn();
    renderHook(() =>
      useKeyboardShortcut({
        key: "k",
        metaKey: true,
        ignoreInputFocus: false,
        onPress,
      }),
    );

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    fireEvent.keyDown(input, { key: "k", metaKey: true, bubbles: true });

    expect(onPress).toHaveBeenCalledTimes(1);

    document.body.removeChild(input);
  });

  it("skips textarea targets when ignoreInputFocus is true", () => {
    const onPress = vi.fn();
    renderHook(() =>
      useKeyboardShortcut({
        key: "k",
        metaKey: true,
        ignoreInputFocus: true,
        onPress,
      }),
    );

    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    textarea.focus();
    fireEvent.keyDown(textarea, { key: "k", metaKey: true, bubbles: true });
    document.body.removeChild(textarea);

    expect(onPress).not.toHaveBeenCalled();
  });

  it("skips select targets when ignoreInputFocus is true", () => {
    const onPress = vi.fn();
    renderHook(() =>
      useKeyboardShortcut({
        key: "k",
        metaKey: true,
        ignoreInputFocus: true,
        onPress,
      }),
    );

    const select = document.createElement("select");
    document.body.appendChild(select);
    fireEvent.keyDown(select, { key: "k", metaKey: true, bubbles: true });
    document.body.removeChild(select);

    expect(onPress).not.toHaveBeenCalled();
  });

  it("skips contenteditable targets when ignoreInputFocus is true", () => {
    const onPress = vi.fn();
    renderHook(() =>
      useKeyboardShortcut({
        key: "k",
        metaKey: true,
        ignoreInputFocus: true,
        onPress,
      }),
    );

    const editable = document.createElement("div");
    editable.contentEditable = "true";
    Object.defineProperty(editable, "isContentEditable", { value: true });
    document.body.appendChild(editable);
    fireEvent.keyDown(editable, { key: "k", metaKey: true, bubbles: true });
    document.body.removeChild(editable);

    expect(onPress).not.toHaveBeenCalled();
  });
});
