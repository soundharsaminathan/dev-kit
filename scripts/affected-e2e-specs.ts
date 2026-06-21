import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

/** Paths that require the full Playwright e2e suite. */
const GLOBAL_PATH_PATTERNS = [
  /^packages\/tokens\//,
  /^packages\/core\//,
  /^apps\/storybook\/e2e\/helpers\//,
  /^apps\/storybook\/\.storybook\//,
  /^apps\/storybook\/playwright\.config\.ts$/,
  /^scripts\/(affected-e2e-specs|run-affected-e2e)\.ts$/,
  /^nx\.json$/,
  /^apps\/storybook\/project\.json$/,
];

/** Story files with no matching e2e spec (intentionally untested). */
const STORIES_WITHOUT_E2E = new Set(["ColorSwatchPicker"]);

export type AffectedE2eResult =
  | { mode: "all"; reason: string }
  | { mode: "specs"; specs: string[] }
  | { mode: "none"; reason: string };

function normalizePath(file: string): string {
  return file.replaceAll("\\", "/");
}

export function pascalToKebab(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}

export function getStagedFiles(): string[] {
  try {
    const output = execSync("git diff --cached --name-only", {
      cwd: workspaceRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    return output.trim().split("\n").filter(Boolean).map(normalizePath);
  } catch {
    return [];
  }
}

export function getChangedFiles(base: string): string[] {
  const normalizedBase = base.startsWith("origin/") ? base : `origin/${base}`;
  const files = new Set<string>();

  for (const ref of [normalizedBase, base]) {
    try {
      const output = execSync(`git diff --name-only ${ref}`, {
        cwd: workspaceRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });

      for (const file of output.trim().split("\n").filter(Boolean)) {
        files.add(normalizePath(file));
      }

      if (files.size > 0) {
        break;
      }
    } catch {
      // Try the next ref variant.
    }
  }

  try {
    const untracked = execSync("git ls-files --others --exclude-standard", {
      cwd: workspaceRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    for (const file of untracked.trim().split("\n").filter(Boolean)) {
      files.add(normalizePath(file));
    }
  } catch {
    // Ignore untracked lookup failures.
  }

  return [...files];
}

export function resolveAffectedE2eSpecs(
  changedFiles: string[],
): AffectedE2eResult {
  if (changedFiles.length === 0) {
    return { mode: "none", reason: "No changed files" };
  }

  for (const file of changedFiles) {
    if (GLOBAL_PATH_PATTERNS.some((pattern) => pattern.test(file))) {
      return {
        mode: "all",
        reason: `Global visual dependency changed: ${file}`,
      };
    }
  }

  const specs = new Set<string>();

  for (const file of changedFiles) {
    const componentDir = file.match(
      /^packages\/components\/src\/([^/]+)\//,
    )?.[1];
    if (componentDir) {
      specs.add(`${componentDir}.spec.ts`);
    }

    const storyName = file.match(
      /^apps\/storybook\/stories\/(\w+)\.stories\./,
    )?.[1];
    if (storyName && !STORIES_WITHOUT_E2E.has(storyName)) {
      specs.add(`${pascalToKebab(storyName)}.spec.ts`);
    }

    const specFile = file.match(/^apps\/storybook\/e2e\/(.+\.spec\.ts)$/)?.[1];
    if (specFile) {
      specs.add(specFile);
    }
  }

  if (specs.size === 0) {
    const hasVisualRelevantChange = changedFiles.some(
      (file) =>
        file.startsWith("packages/components/") ||
        file.startsWith("apps/storybook/"),
    );

    if (hasVisualRelevantChange) {
      return {
        mode: "all",
        reason: "Unmapped visual changes in components or storybook",
      };
    }

    const hasNxOrScriptChange = changedFiles.some(
      (file) =>
        file === "nx.json" ||
        file.startsWith("scripts/") ||
        file.endsWith("/project.json"),
    );

    if (hasNxOrScriptChange) {
      return {
        mode: "all",
        reason: "Nx or affected e2e configuration changed",
      };
    }

    return {
      mode: "none",
      reason: "No visual-relevant file changes",
    };
  }

  return {
    mode: "specs",
    specs: [...specs].sort(),
  };
}

export function resolveAffectedE2eFromGit(base: string): AffectedE2eResult {
  return resolveAffectedE2eSpecs(getChangedFiles(base));
}

export function resolveAffectedE2eFromStaged(): AffectedE2eResult {
  return resolveAffectedE2eSpecs(getStagedFiles());
}

export function toPlaywrightArgs(result: AffectedE2eResult): string[] {
  if (result.mode === "all") {
    return [];
  }

  if (result.mode === "none") {
    return [];
  }

  return result.specs.map((spec) => `e2e/${spec}`);
}

function parseBaseArg(argv: string[]): string {
  const baseFlagIndex = argv.indexOf("--base");
  if (baseFlagIndex !== -1 && argv[baseFlagIndex + 1]) {
    return argv[baseFlagIndex + 1];
  }

  return process.env.NX_BASE ?? process.env.GITHUB_BASE_REF ?? "origin/main";
}

function hasFlag(argv: string[], flag: string): boolean {
  return argv.includes(flag);
}

if (import.meta.url.endsWith(process.argv[1]?.replaceAll("\\", "/") ?? "")) {
  const argv = process.argv.slice(2);
  const result = hasFlag(argv, "--staged")
    ? resolveAffectedE2eFromStaged()
    : resolveAffectedE2eFromGit(parseBaseArg(argv));

  if (result.mode === "all") {
    console.log("all");
    console.error(result.reason);
  } else if (result.mode === "none") {
    console.log("none");
    console.error(result.reason);
  } else {
    console.log(result.specs.join("\n"));
  }
}
