import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  collectDeprecatedUsages,
  formatDeprecatedUsages,
  resolveTsconfigProjects,
} from "../check-deprecated.ts";

const fixtureRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures/check-deprecated",
);
const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

describe("check-deprecated", () => {
  it("returns no deprecated usages for a clean snippet", () => {
    const usages = collectDeprecatedUsages(
      [path.join(fixtureRoot, "tsconfig.json")],
      fixtureRoot,
    );

    expect(usages).toEqual([]);
  });

  it("returns an empty report string when there are no usages", () => {
    expect(formatDeprecatedUsages([])).toBe("");
  });

  it("falls back to default project configs when the root tsconfig is missing", () => {
    const projects = resolveTsconfigProjects(
      path.join(fixtureRoot, "missing-root-tsconfig.json"),
    );

    expect(projects).toEqual([
      "packages/tokens/tsconfig.json",
      "packages/core/tsconfig.json",
      "packages/components/tsconfig.json",
      "apps/storybook/tsconfig.json",
      "apps/showcase/tsconfig.json",
    ]);
  });

  it("reads project references from the workspace tsconfig", () => {
    const projects = resolveTsconfigProjects(
      path.join(workspaceRoot, "tsconfig.json"),
    );

    expect(projects.length).toBeGreaterThan(0);
    expect(projects.every((project) => project.endsWith("tsconfig.json"))).toBe(
      true,
    );
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
