import { execSync } from "node:child_process";
import { describe, expect, it, vi } from "vitest";
import { buildVitestCiCommand, runVitestCi } from "../run-vitest-ci.ts";

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
    expect(command).toContain("--outputFile=test-results/junit-components.xml");
  });

  it("omits junit reporters in coverage-only mode", () => {
    const command = buildVitestCiCommand("scripts", { coverageOnly: true });

    expect(command).not.toContain("--reporter=junit");
    expect(command).not.toContain("--outputFile=");
  });
});

describe("runVitestCi", () => {
  it("executes the generated vitest command in the workspace root", () => {
    mockExecSync.mockClear();

    runVitestCi("scripts", { coverageOnly: true });

    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringMatching(/^pnpm exec vitest run /),
      expect.objectContaining({
        cwd: expect.stringContaining("dev-kit"),
        stdio: "inherit",
      }),
    );
  });
});
