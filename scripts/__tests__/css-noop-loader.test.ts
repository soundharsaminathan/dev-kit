import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { load } from "../css-noop-loader.mjs";

describe("css-noop-loader", () => {
  it("stubs css and scss modules", async () => {
    for (const file of [
      "/tmp/button.css",
      "/tmp/button.module.scss",
      "file:///tmp/menu.css?v=1",
    ]) {
      const result = await load(file, {}, async () => {
        throw new Error("nextLoad should not run");
      });
      expect(result.shortCircuit).toBe(true);
      expect(result.format).toBe("module");
      expect(result.source).toContain("export default");
    }
  });

  it("defers non-style modules to nextLoad", async () => {
    const url = pathToFileURL("/tmp/Button.js").href;
    const result = await load(url, {}, async () => ({
      format: "module",
      source: "export const ok = true;\n",
    }));
    expect(result.source).toContain("ok = true");
  });
});
