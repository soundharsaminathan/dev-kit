import { describe, expect, it } from "vitest";
import {
  CANONICAL_FREE_STYLE_LABEL,
  canonicalizeDanceCategories,
  canonicalizeFreeStyleName,
  canonicalizeStyleList,
  isFreeStyleName,
  styleIdentityKey,
} from "./dance-style-name";

describe("isFreeStyleName", () => {
  it("matches free-style variants", () => {
    expect(isFreeStyleName("Free Style")).toBe(true);
    expect(isFreeStyleName("freestyle")).toBe(true);
    expect(isFreeStyleName("Free-style")).toBe(true);
    expect(isFreeStyleName("free")).toBe(true);
    expect(isFreeStyleName("Free style & Choreography")).toBe(true);
  });

  it("does not match unrelated names that only share letters", () => {
    expect(isFreeStyleName("Freedom")).toBe(false);
    expect(isFreeStyleName("Hip Hop")).toBe(false);
  });
});

describe("canonicalizeFreeStyleName", () => {
  it("rewrites names that contain free as Free Style", () => {
    expect(canonicalizeFreeStyleName("freestyle")).toBe(
      CANONICAL_FREE_STYLE_LABEL,
    );
    expect(canonicalizeFreeStyleName("Free Style")).toBe(
      CANONICAL_FREE_STYLE_LABEL,
    );
    expect(canonicalizeFreeStyleName("Free style & Choreography")).toBe(
      CANONICAL_FREE_STYLE_LABEL,
    );
  });

  it("leaves other styles unchanged", () => {
    expect(canonicalizeFreeStyleName("Hip Hop")).toBe("Hip Hop");
  });
});

describe("styleIdentityKey", () => {
  it("collapses free-style spellings", () => {
    expect(styleIdentityKey("Free Style")).toBe(styleIdentityKey("freestyle"));
    expect(styleIdentityKey("Hip-hop")).toBe("hiphop");
  });
});

describe("canonicalizeStyleList", () => {
  it("dedupes free-style variants", () => {
    expect(
      canonicalizeStyleList(["freestyle", "Free Style", "Hip Hop"]),
    ).toEqual(["Free Style", "Hip Hop"]);
  });
});

describe("canonicalizeDanceCategories", () => {
  it("rewrites category names that contain free", () => {
    expect(
      canonicalizeDanceCategories([
        { name: "freestyle", description: "Open work" },
        { name: "Jazz", description: "Foundations" },
      ]),
    ).toEqual([
      { name: "Free Style", description: "Open work" },
      { name: "Jazz", description: "Foundations" },
    ]);
  });
});
