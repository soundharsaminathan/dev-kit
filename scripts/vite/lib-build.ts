import { writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
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

/** Resolve a CSS asset path relative to the emitting JS chunk. */
export function toRelativeCssImport(
  fromChunkFileName: string,
  cssFileName: string,
): string {
  const rel = relative(dirname(fromChunkFileName), cssFileName).replace(
    /\\/g,
    "/",
  );
  return rel.startsWith(".") ? rel : `./${rel}`;
}

type ChunkWithViteCss = {
  type: string;
  fileName: string;
  code: string;
  viteMetadata?: {
    importedCss?: Set<string>;
  };
};

/**
 * Injects per-chunk CSS side-effect imports (so consumers don't need the
 * styles barrel) and regenerates styles.js with every extracted CSS file
 * for Storybook/showcase.
 *
 * Vite populates `chunk.viteMetadata.importedCss` during its own
 * `renderChunk` pass, so injection must happen in `generateBundle`.
 */
export function emitStylesEntryPlugin(outDir = "dist"): Plugin {
  let cssImports = "";

  return {
    name: "emit-styles-entry",
    apply: "build",
    enforce: "post",
    config() {
      return {
        build: {
          cssCodeSplit: true,
        },
      };
    },
    generateBundle(_options, bundle) {
      for (const item of Object.values(bundle)) {
        const chunk = item as ChunkWithViteCss;
        if (chunk.type !== "chunk") {
          continue;
        }

        const importedCss = chunk.viteMetadata?.importedCss;
        if (!importedCss?.size) {
          continue;
        }

        const imports = [...importedCss]
          .sort()
          .map(
            (cssFileName) =>
              `import "${toRelativeCssImport(chunk.fileName, cssFileName)}";`,
          )
          .join("\n");

        chunk.code = `${imports}\n${chunk.code}`;
      }

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
