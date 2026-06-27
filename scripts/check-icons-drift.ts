import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

export type IconGeneratedSnapshot = {
  iconNames: string;
  packIds: string;
  packLoaders: string;
  lucidePack: string;
};

export const ICON_GENERATED_PATHS = {
  iconNames: "packages/icons/src/generated/icon-names.ts",
  packIds: "packages/icons/src/generated/pack-ids.ts",
  packLoaders: "packages/icons/src/loaders/pack-loaders.generated.ts",
  lucidePack: "packages/icons-packs/src/lucide/index.tsx",
} as const satisfies Record<keyof IconGeneratedSnapshot, string>;

export function readIconGeneratedSnapshot(
  rootDir: string,
  readFile: (absolutePath: string) => string = (absolutePath) =>
    readFileSync(absolutePath, "utf8"),
): IconGeneratedSnapshot {
  return {
    iconNames: readFile(path.join(rootDir, ICON_GENERATED_PATHS.iconNames)),
    packIds: readFile(path.join(rootDir, ICON_GENERATED_PATHS.packIds)),
    packLoaders: readFile(path.join(rootDir, ICON_GENERATED_PATHS.packLoaders)),
    lucidePack: readFile(path.join(rootDir, ICON_GENERATED_PATHS.lucidePack)),
  };
}

export function findIconCodegenDrift(
  before: IconGeneratedSnapshot,
  after: IconGeneratedSnapshot,
): (keyof IconGeneratedSnapshot)[] {
  return (Object.keys(before) as (keyof IconGeneratedSnapshot)[]).filter(
    (key) => before[key] !== after[key],
  );
}

export function runBuildIcons(rootDir: string): void {
  execSync("pnpm exec tsx packages/icons/scripts/build-icons.ts", {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

export function runCheckIconsDrift(
  options: {
    rootDir?: string;
    readSnapshot?: (rootDir: string) => IconGeneratedSnapshot;
    runBuild?: (rootDir: string) => void;
    log?: typeof console.log;
    error?: typeof console.error;
    exit?: (code: number) => never;
  } = {},
): void {
  const rootDir = options.rootDir ?? workspaceRoot;
  const readSnapshot =
    options.readSnapshot ?? ((dir) => readIconGeneratedSnapshot(dir));
  const runBuild = options.runBuild ?? runBuildIcons;
  const log = options.log ?? console.log;
  const error = options.error ?? console.error;
  const exit = options.exit ?? ((code: number) => process.exit(code));

  const before = readSnapshot(rootDir);
  runBuild(rootDir);
  const after = readSnapshot(rootDir);
  const drifted = findIconCodegenDrift(before, after);

  if (drifted.length > 0) {
    error("Icon codegen drift detected in:");
    for (const file of drifted) {
      error(`  - ${file}`);
    }
    error('Run "pnpm icons:build" and commit the generated output.');
    exit(1);
  }

  log("Icon generated files are up to date.");
}

const entryPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === entryPath) {
  runCheckIconsDrift();
}
