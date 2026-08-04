import { describe, expect, it } from "vitest";
import {
  collectTrainerStyleFilters,
  resolveDanceStyle,
  trainerHasStyle,
} from "@/lib/dance-styles";

describe("resolveDanceStyle", () => {
  it("creates fallback metadata when no catalog is provided", () => {
    const style = resolveDanceStyle("Hip Hop");
    expect(style.label).toBe("Hip Hop");
    expect(style.abbrev).toBe("HH");
    expect(style.id).toBe("hip-hop");
  });

  it("creates fallback metadata for unknown styles", () => {
    const style = resolveDanceStyle("Krump");
    expect(style.label).toBe("Krump");
    expect(style.abbrev).toBe("KR");
  });

  it("resolves from a studio catalog", () => {
    const catalog = [
      {
        id: "krump",
        label: "Krump",
        abbrev: "KR",
        color: "#111111",
        emoji: "🔥",
      },
    ];
    expect(resolveDanceStyle("Krump", catalog)).toEqual(catalog[0]);
  });
});

describe("trainerHasStyle", () => {
  it("matches stored labels case-insensitively by style id", () => {
    expect(trainerHasStyle(["Hip Hop", "House"], "House")).toBe(true);
    expect(trainerHasStyle(["Hip Hop"], "Jazz")).toBe(false);
  });
});

describe("collectTrainerStyleFilters", () => {
  it("filters the provided catalog to styles present on trainers", () => {
    const catalog = [
      {
        id: "hip-hop",
        label: "Hip Hop",
        abbrev: "HH",
        color: "#E4572E",
        emoji: "🎤",
      },
      {
        id: "krump",
        label: "Krump",
        abbrev: "KR",
        color: "#111111",
        emoji: "🔥",
      },
    ];
    const filters = collectTrainerStyleFilters(
      [{ styles: ["Krump"] }, { styles: ["Hip Hop"] }],
      catalog,
    );
    expect(filters.map((filter) => filter.label)).toEqual(["Hip Hop", "Krump"]);
  });

  it("builds filters from trainer styles when no catalog is set", () => {
    const filters = collectTrainerStyleFilters([
      { styles: ["Krump"] },
      { styles: ["Hip Hop", "Krump"] },
    ]);
    expect(filters.map((filter) => filter.label)).toEqual(["Krump", "Hip Hop"]);
  });
});
