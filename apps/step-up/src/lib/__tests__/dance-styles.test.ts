import { describe, expect, it } from "vitest";
import {
  collectStyleFilterChips,
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

  it("collapses free-style spellings onto the catalog label", () => {
    expect(resolveDanceStyle("freestyle").label).toBe("Free Style");
    expect(resolveDanceStyle("Free Style").label).toBe("Free Style");
    expect(trainerHasStyle(["freestyle"], "Free Style")).toBe(true);
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
    expect(filters.map((filter) => filter.label)).toEqual(["Hip Hop", "Krump"]);
  });

  it("collapses free-style variants into one filter chip", () => {
    const filters = collectTrainerStyleFilters([
      { styles: ["freestyle"] },
      { styles: ["Free Style"] },
    ]);
    expect(filters.map((filter) => filter.label)).toEqual(["Free Style"]);
  });
});

describe("collectStyleFilterChips", () => {
  it("collapses free-text spellings so filters show one chip", () => {
    expect(
      collectStyleFilterChips(["Free Style", "freestyle", "Hip Hop"]),
    ).toEqual([
      { id: "Free Style", label: "Free Style" },
      { id: "Hip Hop", label: "Hip Hop" },
    ]);
  });
});
