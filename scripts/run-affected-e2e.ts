import { spawnSync } from "node:child_process";
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

function runPlaywright(extraArgs: string[]): number {
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

const argv = process.argv.slice(2);
const affected = hasFlag(argv, "--staged")
  ? resolveAffectedE2eFromStaged()
  : resolveAffectedE2eFromGit(parseBaseArg(argv));

if (affected.mode === "none") {
  console.log(`Skipping Playwright e2e: ${affected.reason}`);
  process.exit(0);
}

if (affected.mode === "all") {
  console.log(`Running full Playwright e2e suite: ${affected.reason}`);
  process.exit(runPlaywright([]));
}

const specArgs = toPlaywrightArgs(affected);
console.log(
  `Running affected Playwright specs (${specArgs.length}): ${specArgs.join(", ")}`,
);
process.exit(runPlaywright(specArgs));
