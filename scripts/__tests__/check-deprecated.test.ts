import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import {
  collectDeprecatedUsages,
  formatDeprecatedUsages,
  resolveTsconfigProjects,
  runCheckDeprecated,
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

  it("throws when a project tsconfig cannot be parsed", () => {
    expect(() =>
      collectDeprecatedUsages(
        [path.join(fixtureRoot, "invalid-tsconfig.json")],
        fixtureRoot,
      ),
    ).toThrow();
  });

  it("resolves referenced project configs from a root tsconfig", () => {
    const projects = resolveTsconfigProjects(
      path.join(fixtureRoot, "root-with-references.json"),
    );

    expect(projects[0]?.replaceAll("\\", "/")).toContain("child/tsconfig.json");
  });

  it("collects deprecated usages from project sources", () => {
    const usages = collectDeprecatedUsages(
      [path.join(fixtureRoot, "deprecated-tsconfig.json")],
      fixtureRoot,
    );

    expect(usages.length).toBeGreaterThan(0);
    expect(usages[0]?.file.replaceAll("\\", "/")).toContain(
      "deprecated-usage.ts",
    );
    expect(usages[0]?.message.toLowerCase()).toContain("deprecated");
  });

  it("sorts deprecated usages by file, line, and column", () => {
    const usages = collectDeprecatedUsages(
      [path.join(fixtureRoot, "deprecated-tsconfig.json")],
      fixtureRoot,
    );

    const sorted = [...usages].sort((left, right) => {
      const byFile = left.file.localeCompare(right.file);
      if (byFile !== 0) {
        return byFile;
      }

      if (left.line !== right.line) {
        return left.line - right.line;
      }

      return left.column - right.column;
    });

    expect(usages).toEqual(sorted);
  });

  it("accepts absolute project config paths", () => {
    const usages = collectDeprecatedUsages(
      [path.join(fixtureRoot, "deprecated-tsconfig.json")],
      fixtureRoot,
    );

    expect(usages.length).toBeGreaterThan(0);
  });

  it("falls back to default project configs when references are empty", () => {
    const projects = resolveTsconfigProjects(
      path.join(fixtureRoot, "empty-references.json"),
    );

    expect(projects).toEqual([
      "packages/tokens/tsconfig.json",
      "packages/core/tsconfig.json",
      "packages/components/tsconfig.json",
      "apps/storybook/tsconfig.json",
      "apps/showcase/tsconfig.json",
    ]);
  });

  it("resolves referenced project directories without a tsconfig suffix", () => {
    const projects = resolveTsconfigProjects(
      path.join(fixtureRoot, "root-with-directory-reference.json"),
    );

    expect(projects[0]?.replaceAll("\\", "/")).toContain("child/tsconfig.json");
  });

  it("throws when the root tsconfig cannot be parsed", () => {
    const brokenPath = path.join(
      os.tmpdir(),
      `broken-tsconfig-${process.pid}.json`,
    );
    fs.writeFileSync(brokenPath, '{\n  "compilerOptions": {\n');

    try {
      expect(() => resolveTsconfigProjects(brokenPath)).toThrow();
    } finally {
      fs.unlinkSync(brokenPath);
    }
  });

  it("reports deprecated usages from main", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    process.exitCode = 0;
    runCheckDeprecated({
      collectUsages: () => [
        {
          file: "src/example.ts",
          line: 1,
          column: 1,
          message: "deprecated",
        },
      ],
      resolveProjects: () => [],
    });

    expect(process.exitCode).toBe(1);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("leaves exit code unchanged when no deprecated usages are found", () => {
    process.exitCode = 0;
    runCheckDeprecated({
      collectUsages: () => [],
      resolveProjects: () => [],
    });
    expect(process.exitCode).toBe(0);
  });
});
