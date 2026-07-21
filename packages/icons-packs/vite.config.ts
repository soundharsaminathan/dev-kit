import { resolve } from "node:path";
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
        entryFileNames: (chunk) => {
          const name = chunk.name.replace(/\/index$/, "");
          return `${name}/index.js`;
        },
        preserveModules: false,
      },
    },
  },
});
