import { describe, expect, it, type Mock, vi } from "vitest";
import {
  resolveAffectedE2eFromGit,
  resolveAffectedE2eFromStaged,
  toPlaywrightArgs,
} from "../affected-e2e-specs.ts";
import {
  createDefaultDeps,
  type RunAffectedE2eDeps,
  runAffectedE2e,
} from "../run-affected-e2e.ts";

type MockRunAffectedE2eDeps = {
  [K in keyof RunAffectedE2eDeps]: Mock<RunAffectedE2eDeps[K]>;
};

function createDeps(
  overrides: Partial<MockRunAffectedE2eDeps> = {},
): MockRunAffectedE2eDeps {
  return {
    resolveAffectedE2eFromGit: vi.fn(),
    resolveAffectedE2eFromStaged: vi.fn(),
    toPlaywrightArgs: vi.fn(),
    spawnSync: vi.fn().mockReturnValue({ status: 0 }),
    ...overrides,
  };
}

function runWithDeps(argv: string[], deps: MockRunAffectedE2eDeps): number {
  return runAffectedE2e(argv, deps as unknown as RunAffectedE2eDeps);
}

describe("runAffectedE2e", () => {
  it("creates default dependencies", () => {
    const deps = createDefaultDeps();

    expect(deps.resolveAffectedE2eFromGit).toBe(resolveAffectedE2eFromGit);
    expect(deps.resolveAffectedE2eFromStaged).toBe(
      resolveAffectedE2eFromStaged,
    );
    expect(deps.toPlaywrightArgs).toBe(toPlaywrightArgs);
    expect(typeof deps.spawnSync).toBe("function");
  });

  it("skips when no affected specs are found", () => {
    const deps = createDeps();
    deps.resolveAffectedE2eFromGit.mockReturnValue({
      mode: "none",
      reason: "no component changes",
    });

    expect(runWithDeps([], deps)).toBe(0);
    expect(deps.spawnSync).not.toHaveBeenCalled();
  });

  it("runs the full suite when all specs are affected", () => {
    const deps = createDeps();
    deps.resolveAffectedE2eFromGit.mockReturnValue({
      mode: "all",
      reason: "shared config changed",
    });

    expect(runWithDeps([], deps)).toBe(0);
    expect(deps.spawnSync).toHaveBeenCalledWith(
      "pnpm",
      expect.arrayContaining(["exec", "playwright", "test"]),
      expect.any(Object),
    );
  });

  it("runs only affected specs from staged changes", () => {
    const deps = createDeps();
    deps.resolveAffectedE2eFromStaged.mockReturnValue({
      mode: "specs",
      specs: ["button"],
    });
    deps.toPlaywrightArgs.mockReturnValue(["e2e/button.spec.ts"]);

    expect(runWithDeps(["--staged"], deps)).toBe(0);
    expect(deps.resolveAffectedE2eFromStaged).toHaveBeenCalled();
    expect(deps.spawnSync).toHaveBeenCalledWith(
      "pnpm",
      expect.arrayContaining(["e2e/button.spec.ts"]),
      expect.any(Object),
    );
  });

  it("uses the provided base ref for git diffs", () => {
    const deps = createDeps();
    deps.resolveAffectedE2eFromGit.mockReturnValue({
      mode: "none",
      reason: "no changes",
    });

    runWithDeps(["--base", "origin/develop"], deps);

    expect(deps.resolveAffectedE2eFromGit).toHaveBeenCalledWith(
      "origin/develop",
    );
  });

  it("returns a non-zero status when playwright fails", () => {
    const deps = createDeps();
    deps.resolveAffectedE2eFromGit.mockReturnValue({
      mode: "all",
      reason: "shared config changed",
    });
    deps.spawnSync.mockReturnValue({ status: 2 } as never);

    expect(runWithDeps([], deps)).toBe(2);
  });

  it("defaults to exit code 1 when playwright returns no status", () => {
    const deps = createDeps();
    deps.resolveAffectedE2eFromGit.mockReturnValue({
      mode: "all",
      reason: "shared config changed",
    });
    deps.spawnSync.mockReturnValue({ status: null } as never);

    expect(runWithDeps([], deps)).toBe(1);
  });

  it("throws when playwright cannot be spawned", () => {
    const deps = createDeps();
    deps.resolveAffectedE2eFromGit.mockReturnValue({
      mode: "all",
      reason: "shared config changed",
    });
    deps.spawnSync.mockReturnValue({
      error: new Error("spawn failed"),
    } as never);

    expect(() => runWithDeps([], deps)).toThrow("spawn failed");
  });
});
