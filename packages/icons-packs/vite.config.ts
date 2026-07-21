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
const entries = Object.fromEntries(
  Object.entries(globEntryMap({ srcDir })).map(([name, file]) => [
    name.replace(/\/index$/, ""),
    file,
  ]),
);

export default defineConfig({
  plugins: [react(), createDtsPlugin({ entryRoot: "src" })],
  build: {
    target: "es2021",
    minify: false,
    outDir: "dist",
    emptyOutDir: true,
    lib: {
      entry: entries,
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
