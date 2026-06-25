import { spawnSync } from "node:child_process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  resolveAffectedE2eFromGit,
  resolveAffectedE2eFromStaged,
  toPlaywrightArgs,
} from "../affected-e2e-specs.ts";
import { runAffectedE2e } from "../run-affected-e2e.ts";

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return {
    ...actual,
    spawnSync: vi.fn(),
  };
});

vi.mock("../affected-e2e-specs.ts", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../affected-e2e-specs.ts")>();
  return {
    ...actual,
    resolveAffectedE2eFromGit: vi.fn(),
    resolveAffectedE2eFromStaged: vi.fn(),
    toPlaywrightArgs: vi.fn(),
  };
});

const mockSpawnSync = vi.mocked(spawnSync);
const mockResolveFromGit = vi.mocked(resolveAffectedE2eFromGit);
const mockResolveFromStaged = vi.mocked(resolveAffectedE2eFromStaged);
const mockToPlaywrightArgs = vi.mocked(toPlaywrightArgs);

describe("runAffectedE2e", () => {
  beforeEach(() => {
    mockSpawnSync.mockReset();
    mockResolveFromGit.mockReset();
    mockResolveFromStaged.mockReset();
    mockToPlaywrightArgs.mockReset();
    mockSpawnSync.mockReturnValue({ status: 0 } as never);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("skips when no affected specs are found", () => {
    mockResolveFromGit.mockReturnValue({
      mode: "none",
      reason: "no component changes",
    });

    expect(runAffectedE2e([])).toBe(0);
    expect(mockSpawnSync).not.toHaveBeenCalled();
  });

  it("runs the full suite when all specs are affected", () => {
    mockResolveFromGit.mockReturnValue({
      mode: "all",
      reason: "shared config changed",
    });

    expect(runAffectedE2e([])).toBe(0);
    expect(mockSpawnSync).toHaveBeenCalledWith(
      "pnpm",
      expect.arrayContaining(["exec", "playwright", "test"]),
      expect.any(Object),
    );
  });

  it("runs only affected specs from staged changes", () => {
    mockResolveFromStaged.mockReturnValue({
      mode: "specs",
      specs: ["button"],
    });
    mockToPlaywrightArgs.mockReturnValue(["e2e/button.spec.ts"]);

    expect(runAffectedE2e(["--staged"])).toBe(0);
    expect(mockResolveFromStaged).toHaveBeenCalled();
    expect(mockSpawnSync).toHaveBeenCalledWith(
      "pnpm",
      expect.arrayContaining(["e2e/button.spec.ts"]),
      expect.any(Object),
    );
  });

  it("uses the provided base ref for git diffs", () => {
    mockResolveFromGit.mockReturnValue({
      mode: "none",
      reason: "no changes",
    });

    runAffectedE2e(["--base", "origin/develop"]);

    expect(mockResolveFromGit).toHaveBeenCalledWith("origin/develop");
  });

  it("returns a non-zero status when playwright fails", () => {
    mockResolveFromGit.mockReturnValue({
      mode: "all",
      reason: "shared config changed",
    });
    mockSpawnSync.mockReturnValue({ status: 2 } as never);

    expect(runAffectedE2e([])).toBe(2);
  });

  it("throws when playwright cannot be spawned", () => {
    mockResolveFromGit.mockReturnValue({
      mode: "all",
      reason: "shared config changed",
    });
    mockSpawnSync.mockReturnValue({
      error: new Error("spawn failed"),
    } as never);

    expect(() => runAffectedE2e([])).toThrow("spawn failed");
  });
});
