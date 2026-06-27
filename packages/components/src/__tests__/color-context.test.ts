import { useColorPickerState } from "@react-stately/color";
import { renderHook } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import {
  ColorPickerStateContext,
  mergeColorPickerProps,
  useColorPickerStateContext,
  useColorPickerStateContextRequired,
} from "../color-context";

describe("color-context", () => {
  it("returns null when no picker provider is mounted", () => {
    const { result } = renderHook(() => useColorPickerStateContext());
    expect(result.current).toBeNull();
  });

  it("throws when a required picker context is missing", () => {
    expect(() =>
      renderHook(() => useColorPickerStateContextRequired("TestComponent")),
    ).toThrow("TestComponent must be used within ColorPicker");
  });

  it("returns picker state from context", () => {
    function Wrapper({ children }: { children: React.ReactNode }) {
      const pickerState = useColorPickerState({ defaultValue: "#6366f1" });
      return createElement(
        ColorPickerStateContext.Provider,
        { value: pickerState },
        children,
      );
    }

    const { result } = renderHook(
      () => useColorPickerStateContextRequired("TestComponent"),
      {
        wrapper: Wrapper,
      },
    );

    expect(result.current.color.toString("hex")).toMatch(/6366f1/i);
  });

  it("merges controlled props when picker state is available", () => {
    function Wrapper({ children }: { children: React.ReactNode }) {
      const pickerState = useColorPickerState({ defaultValue: "#6366f1" });
      return createElement(
        ColorPickerStateContext.Provider,
        { value: pickerState },
        children,
      );
    }

    const { result } = renderHook(
      () =>
        mergeColorPickerProps(
          { defaultValue: "#111111", "aria-label": "Hue" },
          useColorPickerStateContext(),
        ),
      { wrapper: Wrapper },
    );

    expect(result.current.value?.toString("hex")).toMatch(/6366f1/i);
    expect(result.current.onChange).toBeTypeOf("function");
    expect(result.current["aria-label"]).toBe("Hue");
  });

  it("returns props unchanged when picker state is missing", () => {
    const props = { defaultValue: "#111111", "aria-label": "Hue" };
    expect(mergeColorPickerProps(props, null)).toBe(props);
  });
});
