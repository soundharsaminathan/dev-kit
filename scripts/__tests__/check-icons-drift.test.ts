import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import {
  findIconCodegenDrift,
  readIconGeneratedSnapshot,
  runBuildIcons,
  runCheckIconsDrift,
} from "../check-icons-drift.ts";

vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
}));

import { execSync } from "node:child_process";

const mockExecSync = vi.mocked(execSync);

const fixtureRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures/check-icons-drift",
);

const snapshot = {
  iconNames: "export const iconNames = [] as const;\n",
  packIds: "export const packIds = [] as const;\n",
  packLoaders: "export const packLoaders = {};\n",
  lucidePack: "export const icons = {};\n",
};

describe("check-icons-drift", () => {
  it("reads the generated icon snapshot from disk", () => {
    const content = readIconGeneratedSnapshot(fixtureRoot);

    expect(content.iconNames).toContain("iconNames");
    expect(content.packIds).toContain("packIds");
    expect(content.packLoaders).toContain("packLoaders");
    expect(content.lucidePack).toContain("icons");
  });

  it("runs the icon build command from the workspace root", () => {
    mockExecSync.mockReturnValue("");

    runBuildIcons(fixtureRoot);

    expect(mockExecSync).toHaveBeenCalledWith(
      "pnpm exec tsx packages/icons/scripts/build-icons.ts",
      expect.objectContaining({
        cwd: fixtureRoot,
        encoding: "utf8",
      }),
    );
  });

  it("uses default collaborators when checking drift", () => {
    const log = vi.fn();
    mockExecSync.mockReturnValue("");

    runCheckIconsDrift({
      rootDir: fixtureRoot,
      log,
    });

    expect(mockExecSync).toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith("Icon generated files are up to date.");
  });

  it("reads snapshot paths with a custom reader", () => {
    const content = readIconGeneratedSnapshot(fixtureRoot, (absolutePath) => {
      return `content:${path.basename(absolutePath)}`;
    });

    expect(content.iconNames).toBe("content:icon-names.ts");
    expect(content.packIds).toBe("content:pack-ids.ts");
    expect(content.packLoaders).toBe("content:pack-loaders.generated.ts");
    expect(content.lucidePack).toBe("content:index.tsx");
  });

  it("returns no drift when generated files are unchanged", () => {
    expect(findIconCodegenDrift(snapshot, snapshot)).toEqual([]);
  });

  it("returns drifted snapshot keys when generated files change", () => {
    expect(
      findIconCodegenDrift(snapshot, {
        ...snapshot,
        iconNames: "changed",
        lucidePack: "changed",
      }),
    ).toEqual(["iconNames", "lucidePack"]);
  });

  it("logs success when icon codegen output is up to date", () => {
    const log = vi.fn();
    const error = vi.fn();
    const exit = vi.fn((code: number) => {
      throw new Error(`exit:${code}`);
    }) as (code: number) => never;
    const readSnapshot = vi.fn(() => snapshot);

    runCheckIconsDrift({
      rootDir: fixtureRoot,
      readSnapshot,
      runBuild: vi.fn(),
      log,
      error,
      exit,
    });

    expect(readSnapshot).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenCalledWith("Icon generated files are up to date.");
    expect(error).not.toHaveBeenCalled();
    expect(exit).not.toHaveBeenCalled();
  });

  it("reports drift and exits when generated files change", () => {
    const error = vi.fn();
    const exit = vi.fn((code: number) => {
      throw new Error(`exit:${code}`);
    }) as (code: number) => never;
    let call = 0;

    expect(() =>
      runCheckIconsDrift({
        rootDir: fixtureRoot,
        readSnapshot: () => {
          call += 1;
          return call === 1
            ? snapshot
            : { ...snapshot, packIds: "export const packIds = ['new'];\n" };
        },
        runBuild: vi.fn(),
        error,
        exit,
      }),
    ).toThrow("exit:1");

    expect(error).toHaveBeenCalledWith("Icon codegen drift detected in:");
    expect(error).toHaveBeenCalledWith("  - packIds");
    expect(error).toHaveBeenCalledWith(
      'Run "pnpm icons:build" and commit the generated output.',
    );
    expect(exit).toHaveBeenCalledWith(1);
  });
});
