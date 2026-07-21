import { describe, expect, it } from "vitest";
import { resolveDanceStyle, trainerHasStyle } from "@/lib/dance-styles";

describe("resolveDanceStyle", () => {
  it("resolves known labels from seed data", () => {
    expect(resolveDanceStyle("Hip Hop").abbrev).toBe("HH");
    expect(resolveDanceStyle("Contemporary").label).toBe("Contemporary");
  });

  it("creates fallback metadata for unknown styles", () => {
    const style = resolveDanceStyle("Krump");
    expect(style.label).toBe("Krump");
    expect(style.abbrev).toBe("KR");
  });
});

describe("trainerHasStyle", () => {
  it("matches stored labels case-insensitively by style id", () => {
    expect(trainerHasStyle(["Hip Hop", "House"], "House")).toBe(true);
    expect(trainerHasStyle(["Hip Hop"], "Jazz")).toBe(false);
  });
});
