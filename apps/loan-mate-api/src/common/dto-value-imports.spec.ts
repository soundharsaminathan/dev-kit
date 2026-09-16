import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * `import type` of a DTO used with `@Body()` erases the runtime class.
 * ValidationPipe then sees `Function`, and forbidNonWhitelisted rejects
 * every field with "property X should not exist".
 */
const TYPE_ONLY_DTO_IMPORT =
  /import\s+type\s*\{[^}]*\}\s*from\s*["'][^"']*dto[^"']*["']/g;

function controllerFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...controllerFiles(fullPath));
    } else if (entry.name.endsWith(".controller.ts")) {
      found.push(fullPath);
    }
  }
  return found;
}

describe("controller DTO value imports", () => {
  it("does not import DTO classes as type-only", () => {
    const controllers = controllerFiles(srcRoot);
    expect(controllers.length).toBeGreaterThan(0);

    const violations: string[] = [];
    for (const filePath of controllers) {
      const source = readFileSync(filePath, "utf8");
      const matches = source.match(TYPE_ONLY_DTO_IMPORT);
      if (matches) {
        violations.push(
          `${filePath.slice(srcRoot.length + 1)}: ${matches.join("; ")}`,
        );
      }
    }

    expect(violations).toEqual([]);
  });
});
