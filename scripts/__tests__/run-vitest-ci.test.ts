import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import {
  buildVitestCiCommand,
  runVitestCi,
  runVitestCiFromArgv,
} from "../run-vitest-ci.ts";

vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
}));

const mockExecSync = vi.mocked(execSync);

describe("buildVitestCiCommand", () => {
  it("writes coverage to a project-specific reports directory", () => {
    const command = buildVitestCiCommand("components");

    expect(command).toContain("--project components");
    expect(command).toContain("--coverage.reportsDirectory=");
    expect(command.replaceAll("\\", "/")).toContain("coverage/components");
    expect(command).toContain("--coverage.reporter=json-summary");
    expect(command).toContain("--coverage.thresholds.lines=90");
    expect(command).toContain("--coverage.thresholds.statements=90");
    expect(command).toContain("--coverage.thresholds.functions=90");
    expect(command).toContain("--coverage.thresholds.branches=90");
    expect(command).toContain("--outputFile=test-results/junit-components.xml");
  });

  it("applies coverage thresholds for app projects", () => {
    const command = buildVitestCiCommand("showcase");

    expect(command).toContain("--coverage.thresholds.lines=90");
    expect(command).toContain("--coverage.thresholds.branches=90");
  });

  it("omits junit reporters in coverage-only mode", () => {
    const command = buildVitestCiCommand("scripts", { coverageOnly: true });

    expect(command).not.toContain("--reporter=junit");
    expect(command).not.toContain("--outputFile=");
  });
});

describe("runVitestCiFromArgv", () => {
  it("throws for an invalid project", () => {
    expect(() => runVitestCiFromArgv(["invalid-project"])).toThrow(
      /Usage: pnpm exec tsx scripts\/run-vitest-ci.ts/,
    );
  });

  it("throws when the project argument is missing", () => {
    expect(() => runVitestCiFromArgv([])).toThrow(
      /Usage: pnpm exec tsx scripts\/run-vitest-ci.ts/,
    );
  });

  it("runs coverage for a valid project argument", () => {
    mockExecSync.mockClear();

    runVitestCiFromArgv(["scripts", "--coverage-only"]);

    expect(mockExecSync).toHaveBeenCalled();
  });
});

describe("runVitestCi", () => {
  it("executes the generated vitest command in the workspace root", () => {
    mockExecSync.mockClear();

    const workspaceRoot = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../..",
    );

    runVitestCi("scripts", { coverageOnly: true });

    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringMatching(/^pnpm exec vitest run /),
      expect.objectContaining({
        cwd: workspaceRoot,
        stdio: "inherit",
      }),
    );
  });
});

describe("run-vitest-ci cli", () => {
  it("runs coverage for a valid project argument", () => {
    const workspaceRoot = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../..",
    );

    expect(() =>
      execSync(
        "pnpm exec tsx scripts/run-vitest-ci.ts scripts --coverage-only",
        {
          cwd: workspaceRoot,
          stdio: "pipe",
          env: process.env,
        },
      ),
    ).not.toThrow();
  });
});
