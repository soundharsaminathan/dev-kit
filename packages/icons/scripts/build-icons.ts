import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { iconCatalog } from "../src/catalog/icon-catalog.ts";
import { type PackId, packLibraries } from "../src/catalog/pack-libraries.ts";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = resolve(rootDir, "../..");
const generatedDir = join(rootDir, "src/generated");
const packsRootDir = resolve(rootDir, "../icons-packs");
const packsSrcDir = join(packsRootDir, "src");

const iconNames = Object.keys(iconCatalog).sort((a, b) => a.localeCompare(b));
const packIds = packLibraries.map((pack) => pack.id);

const SHADOW_RESTRICTED_NAMES = new Set([
  "Array",
  "ArrayBuffer",
  "BigInt",
  "Boolean",
  "DataView",
  "Date",
  "Error",
  "EvalError",
  "Float32Array",
  "Float64Array",
  "Function",
  "Infinity",
  "Int16Array",
  "Int32Array",
  "Int8Array",
  "Intl",
  "JSON",
  "Map",
  "Math",
  "NaN",
  "Number",
  "Object",
  "Promise",
  "Proxy",
  "RangeError",
  "ReferenceError",
  "Reflect",
  "RegExp",
  "Set",
  "String",
  "Symbol",
  "SyntaxError",
  "TypeError",
  "URIError",
  "Uint16Array",
  "Uint32Array",
  "Uint8Array",
  "Uint8ClampedArray",
  "WeakMap",
  "WeakSet",
  "arguments",
  "eval",
  "globalThis",
  "undefined",
]);

function writeGeneratedFile(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}

function buildIconNames(): void {
  const namesLiteral = iconNames.map((name) => `  "${name}",`).join("\n");

  writeGeneratedFile(
    join(generatedDir, "icon-names.ts"),
    `// AUTO-GENERATED - DO NOT EDIT
// Run "pnpm icons:build" to regenerate

export const iconNames = [
${namesLiteral}
] as const;

export type IconName = (typeof iconNames)[number];
`,
  );
}

function buildPackIds(): void {
  const idsLiteral = packIds.map((id) => `  "${id}",`).join("\n");

  writeGeneratedFile(
    join(generatedDir, "pack-ids.ts"),
    `// AUTO-GENERATED - DO NOT EDIT
// Run "pnpm icons:build" to regenerate

export const packIds = [
${idsLiteral}
] as const;

export type GeneratedPackId = (typeof packIds)[number];
`,
  );
}

function buildPackLoaders(): void {
  const loaderEntries = packIds
    .map((id) => `  "${id}": () => import("@dev-ui/icons-packs/${id}"),`)
    .join("\n");

  writeGeneratedFile(
    join(rootDir, "src/loaders/pack-loaders.generated.ts"),
    `// AUTO-GENERATED - DO NOT EDIT
// Run "pnpm icons:build" to regenerate

export const generatedPackLoaders = {
${loaderEntries}
};
`,
  );
}

const MATERIAL_SYMBOL_STYLES = {
  outlined: {
    className: "material-symbols-outlined",
    fontFamily: "Material Symbols Outlined Variable",
    fontFallback: "Material Symbols Outlined",
    fontImport: "@fontsource-variable/material-symbols-outlined/wght.css",
    fontPackage: "@fontsource-variable/material-symbols-outlined",
  },
  rounded: {
    className: "material-symbols-rounded",
    fontFamily: "Material Symbols Rounded Variable",
    fontFallback: "Material Symbols Rounded",
    fontImport: "@fontsource-variable/material-symbols-rounded/wght.css",
    fontPackage: "@fontsource-variable/material-symbols-rounded",
  },
  sharp: {
    className: "material-symbols-sharp",
    fontFamily: "Material Symbols Sharp Variable",
    fontFallback: "Material Symbols Sharp",
    fontImport: "@fontsource-variable/material-symbols-sharp/wght.css",
    fontPackage: "@fontsource-variable/material-symbols-sharp",
  },
} as const;

type PackConfig = (typeof packLibraries)[number];
type MaterialSymbolsVariant = keyof typeof MATERIAL_SYMBOL_STYLES;
type PhosphorWeight = "regular" | "fill" | "duotone";

function isMaterialSymbolsPack(
  pack: PackConfig,
): pack is PackConfig & { materialSymbols: MaterialSymbolsVariant } {
  return "materialSymbols" in pack;
}

function isPhosphorPack(
  pack: PackConfig,
): pack is PackConfig & { phosphorWeight: PhosphorWeight } {
  return "phosphorWeight" in pack;
}

function buildMaterialSymbolComponent(
  iconName: string,
  exportName: string,
  variant: keyof typeof MATERIAL_SYMBOL_STYLES,
): string {
  const symbolClass = MATERIAL_SYMBOL_STYLES[variant].className;

  return `const ${exportName} = ({
  className,
  style,
  "aria-hidden": ariaHidden = true,
}: {
  className?: string;
  style?: React.CSSProperties;
  "aria-hidden"?: boolean;
}) => (
  <span
    aria-hidden={ariaHidden}
    className={className ? \`${symbolClass} \${className}\` : "${symbolClass}"}
    style={{ fontSize: "1.25em", lineHeight: 1, ...style }}
  >
    ${iconName}
  </span>
);`;
}

function buildMaterialSymbolsCss(
  variant: keyof typeof MATERIAL_SYMBOL_STYLES,
): string {
  const { className, fontFamily, fontFallback } =
    MATERIAL_SYMBOL_STYLES[variant];

  return `.${className} {
  font-family: "${fontFamily}", "${fontFallback}", sans-serif;
  font-weight: normal;
  font-style: normal;
  font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24;
  display: inline-block;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-smoothing: antialiased;
  font-feature-settings: "liga";
}
`;
}

function buildPhosphorComponent(
  semanticName: string,
  sourceName: string,
  weight: string,
): string {
  const exportName = toExportName(semanticName);
  return `const ${exportName} = (
  props: Omit<React.ComponentProps<typeof ${sourceName}>, "weight">,
) => <${sourceName} weight="${weight}" {...props} />;`;
}

function buildPackModule(packId: PackId): string {
  const packConfig = packLibraries.find((pack) => pack.id === packId);
  if (!packConfig) {
    throw new Error(`Unknown pack: ${packId}`);
  }

  const mappings = iconNames
    .map((semanticName) => {
      const entry = iconCatalog[semanticName];
      const sourceName = entry?.[packId];
      if (!sourceName) {
        throw new Error(
          `Icon "${semanticName}" is missing mapping for pack "${packId}"`,
        );
      }
      return { semanticName, sourceName };
    })
    .sort((a, b) => a.semanticName.localeCompare(b.semanticName));

  if (isMaterialSymbolsPack(packConfig)) {
    const components = mappings
      .map(({ semanticName, sourceName }) => {
        const exportName = toExportName(semanticName);
        return buildMaterialSymbolComponent(
          sourceName,
          exportName,
          packConfig.materialSymbols,
        );
      })
      .join("\n\n");

    const packEntries = mappings
      .map(({ semanticName }) => {
        const exportName = toExportName(semanticName);
        return `  "${semanticName}": ${exportName},`;
      })
      .join("\n");

    const materialStyle = MATERIAL_SYMBOL_STYLES[packConfig.materialSymbols];

    return `"use client";

import "${materialStyle.fontImport}";
import "./material-symbols.css";
import type React from "react";

${components}

const pack = {
  id: "${packId}",
  icons: {
${packEntries}
  },
};

export default pack;
`;
  }

  const uniqueSourceNames = [
    ...new Set(mappings.map((mapping) => mapping.sourceName)),
  ].sort((a, b) => a.localeCompare(b));

  const imports = uniqueSourceNames
    .map((name) => {
      const safeName = toSafeIdentifier(name);
      return safeName === name ? `  ${name},` : `  ${name} as ${safeName},`;
    })
    .join("\n");

  const wrappers = isPhosphorPack(packConfig)
    ? mappings
        .map(({ semanticName, sourceName }) =>
          buildPhosphorComponent(
            semanticName,
            sourceName,
            packConfig.phosphorWeight,
          ),
        )
        .join("\n\n")
    : "";

  const packEntries = mappings
    .map(({ semanticName, sourceName }) => {
      const exportName = isPhosphorPack(packConfig)
        ? toExportName(semanticName)
        : toSafeIdentifier(sourceName);
      return `  "${semanticName}": ${exportName},`;
    })
    .join("\n");

  return `"use client";

import type React from "react";
import {
${imports}
} from "${packConfig.importPath}";

${wrappers ? `${wrappers}\n\n` : ""}const pack = {
  id: "${packId}",
  icons: {
${packEntries}
  },
};

export default pack;
`;
}

function toExportName(semanticName: string): string {
  return toSafeIdentifier(
    semanticName
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(""),
  );
}

function toSafeIdentifier(name: string): string {
  return SHADOW_RESTRICTED_NAMES.has(name) ? `${name}Icon` : name;
}

function buildPackPackages(): void {
  mkdirSync(packsSrcDir, { recursive: true });

  const peerDeps: Record<string, string> = {
    react: ">=19.2.0 <20",
    "lucide-react": "*",
    "@heroicons/react": "*",
    "@phosphor-icons/react": "*",
    "@tabler/icons-react": "*",
    "@fluentui/react-icons": "*",
  };

  const devDependencies: Record<string, string> = {
    "@fluentui/react-icons": "^2.0.319",
    "@heroicons/react": "^2.2.0",
    "@phosphor-icons/react": "^2.1.10",
    "@tabler/icons-react": "^3.36.0",
    "@vitejs/plugin-react": "^5.1.0",
    "lucide-react": "^0.575.0",
    typescript: "^6.0.3",
    vite: "catalog:",
    "vite-plugin-dts": "^4.5.4",
  };

  const exports: Record<string, Record<string, string>> = {};
  const hasMaterialSymbols = packLibraries.some(isMaterialSymbolsPack);

  for (const packId of packIds) {
    const packEntryDir = join(packsSrcDir, packId);
    const packConfig = packLibraries.find((pack) => pack.id === packId);
    mkdirSync(packEntryDir, { recursive: true });
    writeGeneratedFile(
      join(packEntryDir, "index.tsx"),
      buildPackModule(packId),
    );

    if (packConfig && isMaterialSymbolsPack(packConfig)) {
      writeGeneratedFile(
        join(packEntryDir, "material-symbols.css"),
        buildMaterialSymbolsCss(packConfig.materialSymbols),
      );
    }

    exports[`./${packId}`] = {
      development: `./src/${packId}/index.tsx`,
      types: `./src/${packId}/index.tsx`,
      import: `./dist/${packId}/index.js`,
      default: `./dist/${packId}/index.js`,
    };
  }

  writeGeneratedFile(
    join(packsRootDir, "package.json"),
    `${JSON.stringify(
      {
        name: "@dev-ui/icons-packs",
        version: "0.0.1",
        private: true,
        type: "module",
        description: "Optional icon packs for DevKit",
        exports,
        files: ["dist", "src"],
        scripts: {
          build: "vite build",
        },
        sideEffects: hasMaterialSymbols
          ? ["**/*.css", "**/material-symbols-*/**"]
          : false,
        ...(hasMaterialSymbols
          ? {
              dependencies: {
                "@fontsource-variable/material-symbols-outlined": "^5.2.7",
                "@fontsource-variable/material-symbols-rounded": "^5.2.7",
                "@fontsource-variable/material-symbols-sharp": "^5.2.7",
              },
            }
          : {}),
        peerDependencies: peerDeps,
        devDependencies,
      },
      null,
      2,
    )}\n`,
  );

  writeGeneratedFile(
    join(packsRootDir, "tsconfig.json"),
    `${JSON.stringify(
      {
        extends: "../../tsconfig.base.json",
        compilerOptions: {
          rootDir: "src",
          outDir: "dist",
          composite: true,
          noEmit: false,
          emitDeclarationOnly: true,
          jsx: "react-jsx",
        },
        include: ["src"],
      },
      null,
      2,
    )}\n`,
  );

  writeGeneratedFile(
    join(packsRootDir, "vite.config.ts"),
    `import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { globEntryMap } from "../../scripts/vite/glob-entries.ts";
import {
  createDtsPlugin,
  createExternalMatcher,
  externalizePackageDeps,
} from "../../scripts/vite/lib-build.ts";
import pkg from "./package.json" with { type: "json" };

const dirname = fileURLToPath(new URL(".", import.meta.url));
const srcDir = resolve(dirname, "src");
const externals = externalizePackageDeps(pkg);

export default defineConfig({
  plugins: [react(), createDtsPlugin({ entryRoot: "src" })],
  build: {
    target: "es2021",
    minify: false,
    outDir: "dist",
    emptyOutDir: true,
    lib: {
      entry: globEntryMap({
        srcDir,
      }),
      formats: ["es"],
    },
    rollupOptions: {
      external: createExternalMatcher(externals),
      output: {
        entryFileNames: "[name]/index.js",
        preserveModules: false,
      },
    },
  },
});
`,
  );

  writeGeneratedFile(
    join(packsRootDir, "project.json"),
    `${JSON.stringify(
      {
        name: "icons-packs",
        $schema: "../../node_modules/nx/schemas/project-schema.json",
        sourceRoot: "packages/icons-packs/src",
        projectType: "library",
        tags: ["scope:shared", "type:lib"],
        targets: {
          typecheck: {
            executor: "nx:run-commands",
            options: {
              cwd: "packages/icons-packs",
              command: "tsc -b --pretty false",
            },
            dependsOn: ["icons:build:icons"],
          },
          build: {
            executor: "nx:run-script",
            options: {
              script: "build",
            },
            outputs: ["{projectRoot}/dist"],
            dependsOn: ["icons:build:icons", "icons:build"],
          },
        },
      },
      null,
      2,
    )}\n`,
  );
}

function formatGeneratedOutputs(): void {
  const paths = [
    "packages/icons-packs/project.json",
    "packages/icons-packs/tsconfig.json",
    "packages/icons-packs/src",
    "packages/icons/src/loaders/pack-loaders.generated.ts",
    "packages/icons/src/generated",
  ];

  execSync(`pnpm exec biome check --write ${paths.join(" ")}`, {
    cwd: workspaceRoot,
    stdio: "inherit",
  });
}

function main(): void {
  buildIconNames();
  buildPackIds();
  buildPackLoaders();
  buildPackPackages();
  formatGeneratedOutputs();
  console.log(
    `Generated ${iconNames.length} icons across ${packIds.length} packs.`,
  );
}

main();
