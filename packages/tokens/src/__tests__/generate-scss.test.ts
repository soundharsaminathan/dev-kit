import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { generateSCSS } from "../scss-generation.js";

describe("generate-scss", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const tempDir of tempDirs.splice(0)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("writes foundation, layer, and theme scss files", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "generate-scss-"));
    tempDirs.push(tempDir);

    generateSCSS(tempDir);

    expect(fs.existsSync(path.join(tempDir, "_foundation.scss"))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, "_semantic.scss"))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, "themes", "_default.scss"))).toBe(
      true,
    );
    expect(fs.existsSync(path.join(tempDir, "themes", "_index.scss"))).toBe(
      true,
    );

    const defaultThemeScss = fs.readFileSync(
      path.join(tempDir, "_default-theme.scss"),
      "utf8",
    );
    expect(defaultThemeScss).toContain("--radius-factor:");
    expect(defaultThemeScss).toContain("--font-sans:");
    expect(defaultThemeScss).toContain("--font-serif:");
    expect(defaultThemeScss).toContain("--font-mono:");
  });
});
