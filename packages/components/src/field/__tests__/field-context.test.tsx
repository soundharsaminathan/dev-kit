import { renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import {
  FieldContext,
  type FieldContextValue,
  getFieldLabelText,
  useFieldInputAria,
} from "../field-context";

function createFieldContext(
  overrides: Partial<FieldContextValue> = {},
): FieldContextValue {
  return {
    name: "email",
    inputId: "input-1",
    labelId: "label-1",
    descriptionId: "desc-1",
    errorId: "error-1",
    labelTextRef: { current: undefined },
    hasDescription: false,
    hasError: false,
    setLabelText: () => {},
    setHasDescription: () => {},
    setHasError: () => {},
    ...overrides,
  };
}

function fieldWrapper(value: FieldContextValue) {
  return ({ children }: { children: ReactNode }) =>
    createElement(FieldContext.Provider, { value }, children);
}

describe("field-context", () => {
  it("extracts string and number label text", () => {
    expect(getFieldLabelText("Name")).toBe("Name");
    expect(getFieldLabelText(42)).toBe("42");
    expect(
      getFieldLabelText(createElement("span", null, "Name")),
    ).toBeUndefined();
  });

  it("returns input aria props without a field context", () => {
    const { result: empty } = renderHook(() => useFieldInputAria({}));
    expect(empty.current).toEqual({});

    const { result: withDesc } = renderHook(() =>
      useFieldInputAria({ "aria-describedby": "existing-desc" }),
    );
    expect(withDesc.current).toEqual({
      "aria-describedby": "existing-desc",
    });
  });

  it("merges field description and error ids into aria props", () => {
    const { result } = renderHook(
      () =>
        useFieldInputAria({
          "aria-describedby": "custom-desc",
        }),
      {
        wrapper: fieldWrapper(
          createFieldContext({ hasDescription: true, hasError: true }),
        ),
      },
    );

    expect(result.current).toEqual({
      "aria-describedby": "custom-desc desc-1",
      "aria-errormessage": "error-1",
    });
  });

  it("uses field description id when no input aria-describedby is provided", () => {
    const { result } = renderHook(() => useFieldInputAria({}), {
      wrapper: fieldWrapper(createFieldContext({ hasDescription: true })),
    });

    expect(result.current).toEqual({
      "aria-describedby": "desc-1",
    });
  });
});
