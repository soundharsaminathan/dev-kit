import { describe, expect, it } from "vitest";
import { resolveIconTheme, resolvePackId } from "../core/types";

describe("resolvePackId", () => {
  it("returns the library when no variant is set", () => {
    expect(resolvePackId({ library: "lucide" })).toBe("lucide");
  });

  it("joins library and variant with a hyphen", () => {
    expect(
      resolvePackId({ library: "material-symbols", variant: "outlined" }),
    ).toBe("material-symbols-outlined");
  });
});

describe("resolveIconTheme", () => {
  it("returns the library for packs without a known variant suffix", () => {
    expect(resolveIconTheme("lucide")).toEqual({ library: "lucide" });
  });

  it.each([
    ["material-symbols-outlined", "material-symbols", "outlined"],
    ["material-symbols-rounded", "material-symbols", "rounded"],
    ["material-symbols-sharp", "material-symbols", "sharp"],
    ["some-pack-outline", "some-pack", "outline"],
    ["some-pack-filled", "some-pack", "filled"],
    ["some-pack-duotone", "some-pack", "duotone"],
  ] as const)("splits %s into library and variant", (packId, library, variant) => {
    expect(resolveIconTheme(packId)).toEqual({ library, variant });
  });
});
