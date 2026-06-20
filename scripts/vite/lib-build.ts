import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";
import dts from "vite-plugin-dts";

type PackageJson = {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

export function externalizePackageDeps(pkg: PackageJson): string[] {
  const deps = [
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.peerDependencies ?? {}),
    "react/jsx-runtime",
  ];

  return [...new Set(deps)];
}

export function createExternalMatcher(externals: string[]) {
  return (id: string) => {
    if (externals.includes(id)) {
      return true;
    }

    return externals.some((dep) => id === dep || id.startsWith(`${dep}/`));
  };
}

export function createDtsPlugin(options: {
  entryRoot: string;
  exclude?: string[];
}): Plugin {
  const { entryRoot, exclude = [] } = options;

  return dts({
    entryRoot,
    exclude: ["**/__tests__/**", ...exclude],
    outDir: "dist",
    tsconfigPath: "./tsconfig.json",
  });
}

/** Regenerates styles.js with side-effect CSS imports after Vite extracts CSS. */
export function emitStylesEntryPlugin(outDir = "dist"): Plugin {
  let cssImports = "";

  return {
    name: "emit-styles-entry",
    generateBundle(_options, bundle) {
      cssImports = Object.keys(bundle)
        .filter((file) => file.endsWith(".css"))
        .sort()
        .map((file) => `import "./${file.replace(/\\/g, "/")}";`)
        .join("\n");
    },
    closeBundle() {
      if (!cssImports) {
        return;
      }

      writeFileSync(resolve(outDir, "styles.js"), `${cssImports}\n`, "utf8");
    },
  };
}
