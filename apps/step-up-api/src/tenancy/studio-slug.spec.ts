import { describe, expect, it } from "vitest";
import { slugifyStudioName, uniquifySlug } from "./studio-slug";

describe("studio-slug", () => {
  it("slugifies studio names", () => {
    expect(slugifyStudioName("  ABC Dance Studio! ")).toBe("abc-dance-studio");
  });

  it("falls back for empty names", () => {
    expect(slugifyStudioName("@@@")).toBe("studio");
  });

  it("uniquifies against a taken set", () => {
    const taken = new Set(["nova", "nova-2"]);
    expect(uniquifySlug("nova", taken)).toBe("nova-3");
  });
});
