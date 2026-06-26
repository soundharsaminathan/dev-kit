import { spawnSync as nodeSpawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  resolveAffectedE2eFromGit,
  resolveAffectedE2eFromStaged,
  toPlaywrightArgs,
} from "./affected-e2e-specs.ts";

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

export type RunAffectedE2eDeps = {
  resolveAffectedE2eFromGit: typeof resolveAffectedE2eFromGit;
  resolveAffectedE2eFromStaged: typeof resolveAffectedE2eFromStaged;
  toPlaywrightArgs: typeof toPlaywrightArgs;
  spawnSync: typeof nodeSpawnSync;
};

export function createDefaultDeps(): RunAffectedE2eDeps {
  return {
    resolveAffectedE2eFromGit,
    resolveAffectedE2eFromStaged,
    toPlaywrightArgs,
    spawnSync: nodeSpawnSync,
  };
}

function hasFlag(argv: string[], flag: string): boolean {
  return argv.includes(flag);
}

function parseBaseArg(argv: string[]): string {
  const baseFlagIndex = argv.indexOf("--base");
  if (baseFlagIndex !== -1 && argv[baseFlagIndex + 1]) {
    return argv[baseFlagIndex + 1];
  }

  return process.env.NX_BASE ?? process.env.GITHUB_BASE_REF ?? "origin/main";
}

function runPlaywright(
  extraArgs: string[],
  spawnSync: RunAffectedE2eDeps["spawnSync"],
): number {
  const args = [
    "exec",
    "playwright",
    "test",
    "--config",
    "playwright.config.ts",
    ...extraArgs,
  ];

  const result = spawnSync("pnpm", args, {
    cwd: path.join(workspaceRoot, "apps/storybook"),
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.error) {
    throw result.error;
  }

  return result.status ?? 1;
}

export function runAffectedE2e(
  argv = process.argv.slice(2),
  deps: RunAffectedE2eDeps = createDefaultDeps(),
): number {
  const affected = hasFlag(argv, "--staged")
    ? deps.resolveAffectedE2eFromStaged()
    : deps.resolveAffectedE2eFromGit(parseBaseArg(argv));

  if (affected.mode === "none") {
    console.log(`Skipping Playwright e2e: ${affected.reason}`);
    return 0;
  }

  if (affected.mode === "all") {
    console.log(`Running full Playwright e2e suite: ${affected.reason}`);
    return runPlaywright([], deps.spawnSync);
  }

  const specArgs = deps.toPlaywrightArgs(affected);
  console.log(
    `Running affected Playwright specs (${specArgs.length}): ${specArgs.join(", ")}`,
  );
  return runPlaywright(specArgs, deps.spawnSync);
}

const argv = process.argv.slice(2);
const entryPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === entryPath) {
  process.exit(runAffectedE2e(argv));
}
