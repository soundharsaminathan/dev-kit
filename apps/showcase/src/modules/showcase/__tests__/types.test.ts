import { describe, expect, it } from "vitest";
import { defaultControlValues } from "../types";

describe("defaultControlValues", () => {
  it("uses explicit defaultValue when provided", () => {
    const values = defaultControlValues([
      { name: "label", type: "string", defaultValue: "Hello" },
      { name: "count", type: "number", defaultValue: 3 },
      { name: "active", type: "boolean", defaultValue: true },
      {
        name: "variant",
        type: "enum",
        options: ["a", "b"],
        defaultValue: "b",
      },
    ]);

    expect(values).toEqual({
      label: "Hello",
      count: 3,
      active: true,
      variant: "b",
    });
  });

  it("applies type fallbacks when defaultValue is omitted", () => {
    const values = defaultControlValues([
      { name: "label", type: "string" },
      { name: "count", type: "number" },
      { name: "active", type: "boolean" },
      { name: "variant", type: "enum", options: ["sm", "lg"] },
    ]);

    expect(values).toEqual({
      label: "",
      count: 0,
      active: false,
      variant: "sm",
    });
  });

  it("skips enum controls with no options", () => {
    expect(
      defaultControlValues([{ name: "variant", type: "enum", options: [] }]),
    ).toEqual({});
  });

  it("matches snapshot for mixed control defaults", () => {
    const values = defaultControlValues([
      { name: "children", type: "string", defaultValue: "Button" },
      {
        name: "variant",
        type: "enum",
        options: ["default", "primary"],
        defaultValue: "default",
      },
      { name: "disabled", type: "boolean", defaultValue: false },
    ]);

    expect(values).toMatchSnapshot();
  });
});
