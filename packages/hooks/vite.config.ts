import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import {
  createDtsPlugin,
  createExternalMatcher,
  externalizePackageDeps,
} from "../../scripts/vite/lib-build.ts";
import pkg from "./package.json" with { type: "json" };

const dirname = fileURLToPath(new URL(".", import.meta.url));
const externals = externalizePackageDeps(pkg);

export default defineConfig({
  plugins: [react(), createDtsPlugin({ entryRoot: "src" })],
  build: {
    target: "es2021",
    minify: false,
    outDir: "dist",
    emptyOutDir: true,
    cssCodeSplit: true,
    lib: {
      entry: resolve(dirname, "src/index.ts"),
      formats: ["es"],
    },
    rollupOptions: {
      external: createExternalMatcher(externals),
      output: {
        entryFileNames: "[name].js",
        preserveModules: false,
      },
    },
  },
});
