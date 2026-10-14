import { describe, expect, it } from "vitest";
import {
  followSlugRedirects,
  slugifyMarketplaceName,
  uniqueMarketplaceSlug,
} from "./slug-redirect";

describe("slug-redirect", () => {
  it("slugifies names and uniquifies with numeric suffixes", () => {
    expect(slugifyMarketplaceName("  Hip Hop Beginners! ")).toBe(
      "hip-hop-beginners",
    );
    expect(uniqueMarketplaceSlug("Hip Hop Beginners", [])).toBe(
      "hip-hop-beginners",
    );
    expect(
      uniqueMarketplaceSlug("Hip Hop Beginners", ["hip-hop-beginners"]),
    ).toBe("hip-hop-beginners-2");
    expect(
      uniqueMarketplaceSlug("Hip Hop Beginners", [
        "hip-hop-beginners",
        "hip-hop-beginners-2",
      ]),
    ).toBe("hip-hop-beginners-3");
  });

  it("follows a redirect chain and stops on cycles", () => {
    const redirects = new Map([
      ["old-class", "renamed-class"],
      ["renamed-class", "hip-hop-beginners"],
    ]);
    expect(followSlugRedirects("old-class", redirects)).toBe(
      "hip-hop-beginners",
    );
    expect(followSlugRedirects("fresh", redirects)).toBe("fresh");

    const loop = new Map([
      ["a", "b"],
      ["b", "a"],
    ]);
    expect(followSlugRedirects("a", loop)).toBe("b");
  });
});
