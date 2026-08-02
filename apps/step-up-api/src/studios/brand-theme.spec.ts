import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { parseBrandTheme } from "./brand-theme";

const validTheme = {
  label: "Acme Dance",
  extends: "step-up",
  color: {
    algorithm: "oklch",
    seeds: {
      neutral: "#8e8e93",
      accent: "#0a84ff",
      success: "#34c759",
      warning: "#ff9f0a",
      danger: "#ff453a",
      info: "#64d2ff",
    },
  },
  radiusFactor: 1.2,
  fonts: {
    sans: "Inter, sans-serif",
  },
  tokenOverrides: {},
};

describe("parseBrandTheme", () => {
  it("returns null for nullish values", () => {
    expect(parseBrandTheme(null)).toBeNull();
    expect(parseBrandTheme(undefined)).toBeNull();
  });

  it("accepts a valid brand theme", () => {
    expect(parseBrandTheme(validTheme)).toEqual(validTheme);
  });

  it("rejects invalid extends", () => {
    expect(() =>
      parseBrandTheme({ ...validTheme, extends: "not-a-theme" }),
    ).toThrow(BadRequestException);
  });

  it("rejects invalid hex seeds", () => {
    expect(() =>
      parseBrandTheme({
        ...validTheme,
        color: {
          ...validTheme.color,
          seeds: { ...validTheme.color.seeds, accent: "blue" },
        },
      }),
    ).toThrow(BadRequestException);
  });

  it("rejects oversized payloads", () => {
    expect(() =>
      parseBrandTheme({
        ...validTheme,
        label: "x".repeat(120_000),
      }),
    ).toThrow(BadRequestException);
  });
});
