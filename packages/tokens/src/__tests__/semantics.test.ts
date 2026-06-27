import { describe, expect, it } from "vitest";
import { semanticTokenBuilders } from "../theme/semantics.js";

describe("semantic token builders", () => {
  it("creates tokens with and without scale metadata", () => {
    const bgWithScales = semanticTokenBuilders.bg("neutral-100", ["neutral"]);
    const bgWithoutScales = semanticTokenBuilders.bg("neutral-950");
    const fgWithScales = semanticTokenBuilders.fg("neutral-950", ["neutral"]);
    const fgWithoutScales = semanticTokenBuilders.fg("neutral-950");
    const bdWithScales = semanticTokenBuilders.bd("neutral-300", ["neutral"]);
    const bdWithoutScales = semanticTokenBuilders.bd("neutral-300");

    expect(bgWithScales.scales).toEqual(["neutral"]);
    expect(bgWithoutScales.scales).toBeUndefined();
    expect(fgWithScales.scales).toEqual(["neutral"]);
    expect(fgWithoutScales.scales).toBeUndefined();
    expect(bdWithScales.scales).toEqual(["neutral"]);
    expect(bdWithoutScales.scales).toBeUndefined();
  });
});
