import { describe, expect, it } from "vitest";
import { toRelativeCssImport } from "../vite/lib-build";

describe("toRelativeCssImport", () => {
  it("resolves CSS next to a flat chunk", () => {
    expect(toRelativeCssImport("button.js", "button.css")).toBe("./button.css");
  });

  it("resolves CSS one level up from a nested entry", () => {
    expect(toRelativeCssImport("button/Button.js", "button.css")).toBe(
      "../button.css",
    );
  });

  it("keeps nested asset paths relative", () => {
    expect(toRelativeCssImport("menu/Menu.js", "assets/menu.css")).toBe(
      "../assets/menu.css",
    );
  });
});
