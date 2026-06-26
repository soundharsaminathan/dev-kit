import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  collectDeprecatedUsages,
  type DeprecatedUsage,
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

const INVALID_CONFIG_TEXT = "not valid json";

const EMPTY_REFERENCES_CONFIG = {
  references: [],
};

const ROOT_WITH_REFERENCES_CONFIG = {
  references: [{ path: "./child/tsconfig.json" }],
};

const ROOT_WITH_DIRECTORY_REFERENCE_CONFIG = {
  references: [{ path: "./child" }],
};

const ROOT_WITH_INVALID_REFERENCE_CONFIG = {
  references: [{}, { path: "child" }, { path: 123 }],
};

const INVALID_EXTENDS_CONFIG = {
  extends: "./missing-base.json",
  include: ["clean.ts"],
};

function normalizeConfigPath(configPath: string): string {
  return path.resolve(configPath).replaceAll("\\", "/");
}

function mockConfigExists(configPath: string, exists = true) {
  const normalizedTarget = normalizeConfigPath(configPath);
  const existsSync = fs.existsSync;

  return vi.spyOn(fs, "existsSync").mockImplementation((filePath) => {
    if (normalizeConfigPath(String(filePath)) === normalizedTarget) {
      return exists;
    }

    return existsSync(filePath);
  });
}

function mockSysReadFile(
  configPath: string,
  input: string | Record<string, unknown>,
) {
  const normalizedTarget = normalizeConfigPath(configPath);
  const readFile = ts.sys.readFile;

  return vi
    .spyOn(ts.sys, "readFile")
    .mockImplementation((fileName, ...args) => {
      if (normalizeConfigPath(fileName) === normalizedTarget) {
        return typeof input === "string" ? input : JSON.stringify(input);
      }

      return readFile.call(ts.sys, fileName, ...args);
    });
}

afterEach(() => {
  vi.restoreAllMocks();
});

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

  it("formats multiple deprecated usages for reporting", () => {
    expect(
      formatDeprecatedUsages([
        {
          file: "apps/showcase/src/a.ts",
          line: 10,
          column: 5,
          message: "'selectedKey' is deprecated.",
        },
        {
          file: "apps/showcase/src/b.ts",
          line: 1,
          column: 1,
          message: "'defaultValue' is deprecated.",
        },
      ]),
    ).toBe(
      "apps/showcase/src/a.ts:10:5 'selectedKey' is deprecated.\napps/showcase/src/b.ts:1:1 'defaultValue' is deprecated.",
    );
  });

  it("throws when a project tsconfig cannot be parsed", () => {
    const configPath = path
      .join(fixtureRoot, "invalid-tsconfig.json")
      .replaceAll("\\", "/");
    mockSysReadFile(configPath, INVALID_EXTENDS_CONFIG);

    expect(() => collectDeprecatedUsages([configPath], fixtureRoot)).toThrow();
  });

  it("resolves referenced project configs from a root tsconfig", () => {
    const configPath = path
      .join(fixtureRoot, "root-with-references.json")
      .replaceAll("\\", "/");
    mockConfigExists(configPath);
    mockSysReadFile(configPath, ROOT_WITH_REFERENCES_CONFIG);

    const projects = resolveTsconfigProjects(configPath);

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
    const configPath = path
      .join(fixtureRoot, "empty-references.json")
      .replaceAll("\\", "/");
    mockConfigExists(configPath);
    mockSysReadFile(configPath, EMPTY_REFERENCES_CONFIG);

    const projects = resolveTsconfigProjects(configPath);

    expect(projects).toEqual([
      "packages/tokens/tsconfig.json",
      "packages/core/tsconfig.json",
      "packages/components/tsconfig.json",
      "apps/storybook/tsconfig.json",
      "apps/showcase/tsconfig.json",
    ]);
  });

  it("resolves referenced project directories without a tsconfig suffix", () => {
    const configPath = path
      .join(fixtureRoot, "root-with-directory-reference.json")
      .replaceAll("\\", "/");
    mockConfigExists(configPath);
    mockSysReadFile(configPath, ROOT_WITH_DIRECTORY_REFERENCE_CONFIG);

    const projects = resolveTsconfigProjects(configPath);

    expect(projects[0]?.replaceAll("\\", "/")).toContain("child/tsconfig.json");
  });

  it("throws when the root tsconfig cannot be parsed", () => {
    const configPath = path
      .join(fixtureRoot, "broken-root-config.json")
      .replaceAll("\\", "/");
    mockConfigExists(configPath);
    mockSysReadFile(configPath, INVALID_CONFIG_TEXT);

    expect(() => resolveTsconfigProjects(configPath)).toThrow();
  });

  it("ignores invalid project reference entries", () => {
    const configPath = path
      .join(fixtureRoot, "root-with-invalid-reference.json")
      .replaceAll("\\", "/");
    mockConfigExists(configPath);
    mockSysReadFile(configPath, ROOT_WITH_INVALID_REFERENCE_CONFIG);

    const projects = resolveTsconfigProjects(configPath);

    expect(projects).toHaveLength(1);
    expect(projects[0]?.replaceAll("\\", "/")).toContain("child/tsconfig.json");
  });

  it("collects deprecated usages from a relative project config path", () => {
    const usages = collectDeprecatedUsages(
      ["deprecated-tsconfig.json"],
      fixtureRoot,
    );

    expect(usages.length).toBeGreaterThan(0);
  });

  it("collects multiple deprecated usages across files", () => {
    const usages = collectDeprecatedUsages(
      [path.join(fixtureRoot, "multi-deprecated-tsconfig.json")],
      fixtureRoot,
    );

    expect(usages.length).toBeGreaterThanOrEqual(2);
    expect(
      new Set(usages.map((usage) => usage.file.replaceAll("\\", "/"))).size,
    ).toBeGreaterThanOrEqual(2);
  });

  it("skips node_modules and declaration files when scanning", () => {
    const usages = collectDeprecatedUsages(
      [path.join(fixtureRoot, "multi-deprecated-tsconfig.json")],
      fixtureRoot,
    );

    expect(
      usages.every(
        (usage) =>
          !usage.file.includes("node_modules") && !usage.file.endsWith(".d.ts"),
      ),
    ).toBe(true);
  });

  it("throws when a project config file cannot be parsed", () => {
    const configPath = path
      .join(fixtureRoot, "broken-config.json")
      .replaceAll("\\", "/");
    mockSysReadFile(configPath, INVALID_CONFIG_TEXT);

    expect(() => collectDeprecatedUsages([configPath], fixtureRoot)).toThrow();
  });

  it("sorts deprecated usages on the same file by line and column", () => {
    const usages = collectDeprecatedUsages(
      [path.join(fixtureRoot, "deprecated-tsconfig.json")],
      fixtureRoot,
    );
    const sameFileUsages = usages.filter((usage) =>
      usage.file.replaceAll("\\", "/").endsWith("deprecated-usage.ts"),
    );

    expect(sameFileUsages.length).toBeGreaterThanOrEqual(2);
    expect(sameFileUsages[0]?.line).toBeLessThanOrEqual(
      sameFileUsages[1]?.line ?? 0,
    );
    if (sameFileUsages[0]?.line === sameFileUsages[1]?.line) {
      expect(sameFileUsages[0]?.column).toBeLessThan(
        sameFileUsages[1]?.column ?? 0,
      );
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

  it("uses the default project resolver when collectUsages is provided", () => {
    const collectUsages = vi.fn<
      (configPaths?: readonly string[]) => DeprecatedUsage[]
    >(() => []);

    process.exitCode = 0;
    runCheckDeprecated({ collectUsages });

    const projects = collectUsages.mock.calls[0]?.[0] ?? [];
    expect(projects.length).toBeGreaterThan(0);
    expect(process.exitCode).toBe(0);
  });

  it("uses the default usage collector when resolveProjects is provided", () => {
    process.exitCode = 0;
    runCheckDeprecated({
      resolveProjects: () => [path.join(fixtureRoot, "tsconfig.json")],
    });
    expect(process.exitCode).toBe(0);
  });

  it("sorts usages on the same line by column", () => {
    const usages = collectDeprecatedUsages(
      [path.join(fixtureRoot, "deprecated-same-line-tsconfig.json")],
      fixtureRoot,
    );
    const sameLineUsages = usages.filter((usage) => usage.line === 1);

    expect(sameLineUsages).toHaveLength(2);
    expect(sameLineUsages[0]?.column).toBeLessThan(
      sameLineUsages[1]?.column ?? 0,
    );
  });
});
