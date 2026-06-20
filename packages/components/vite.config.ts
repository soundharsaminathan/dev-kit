import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { globEntryMap } from "../../scripts/vite/glob-entries.ts";
import {
  createDtsPlugin,
  createExternalMatcher,
  emitStylesEntryPlugin,
  externalizePackageDeps,
} from "../../scripts/vite/lib-build.ts";
import pkg from "./package.json" with { type: "json" };

const dirname = fileURLToPath(new URL(".", import.meta.url));
const srcDir = resolve(dirname, "src");
const externals = externalizePackageDeps(pkg);

export default defineConfig({
  plugins: [
    react(),
    createDtsPlugin({
      entryRoot: "src",
      exclude: ["**/*.stories.tsx"],
    }),
    emitStylesEntryPlugin(),
  ],
  build: {
    target: "es2021",
    minify: false,
    outDir: "dist",
    emptyOutDir: true,
    cssCodeSplit: true,
    lib: {
      entry: globEntryMap({
        srcDir,
        ignore: ["**/__tests__/**"],
      }),
      formats: ["es"],
    },
    rollupOptions: {
      external: createExternalMatcher(externals),
      output: {
        entryFileNames: "[name].js",
        assetFileNames: "[name][extname]",
        preserveModules: false,
      },
    },
  },
  css: {
    modules: {
      localsConvention: "camelCaseOnly",
    },
  },
});
