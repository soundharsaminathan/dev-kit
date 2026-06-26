import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

function runBuildIcons(): string {
  return execSync("pnpm exec tsx packages/icons/scripts/build-icons.ts", {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function readGenerated(relativePath: string): string {
  return readFileSync(resolve(rootDir, relativePath), "utf8");
}

const before = {
  iconNames: readGenerated("packages/icons/src/generated/icon-names.ts"),
  packIds: readGenerated("packages/icons/src/generated/pack-ids.ts"),
  packLoaders: readGenerated(
    "packages/icons/src/loaders/pack-loaders.generated.ts",
  ),
  lucidePack: readGenerated("packages/icons-packs/src/lucide/index.tsx"),
};

runBuildIcons();

const after = {
  iconNames: readGenerated("packages/icons/src/generated/icon-names.ts"),
  packIds: readGenerated("packages/icons/src/generated/pack-ids.ts"),
  packLoaders: readGenerated(
    "packages/icons/src/loaders/pack-loaders.generated.ts",
  ),
  lucidePack: readGenerated("packages/icons-packs/src/lucide/index.tsx"),
};

const drifted = Object.entries(before).filter(
  ([key, content]) => content !== after[key as keyof typeof after],
);

if (drifted.length > 0) {
  console.error("Icon codegen drift detected in:");
  for (const [file] of drifted) {
    console.error(`  - ${file}`);
  }
  console.error('Run "pnpm icons:build" and commit the generated output.');
  process.exit(1);
}

console.log("Icon generated files are up to date.");
