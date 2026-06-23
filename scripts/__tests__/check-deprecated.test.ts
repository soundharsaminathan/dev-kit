import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  collectDeprecatedUsages,
  formatDeprecatedUsages,
} from "../check-deprecated.ts";

const fixtureRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures/check-deprecated",
);

describe("check-deprecated", () => {
  it("returns no deprecated usages for a clean snippet", () => {
    const usages = collectDeprecatedUsages(
      [path.join(fixtureRoot, "tsconfig.json")],
      fixtureRoot,
    );

    expect(usages).toEqual([]);
  });

  it("formats deprecated usages for reporting", () => {
    expect(
      formatDeprecatedUsages([
        {
          file: "apps/showcase/src/example.ts",
          line: 10,
          column: 5,
          message: "'selectedKey' is deprecated.",
        },
      ]),
    ).toBe("apps/showcase/src/example.ts:10:5 'selectedKey' is deprecated.");
  });
});
