import path from "node:path";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import {
  CORE_OPTIMIZE_DEPS,
  devAppOptimizeDeps,
} from "../../scripts/vite/dev-app";

const appRoot = import.meta.dirname;

export default defineConfig({
  server: {
    port: 5173,
  },
  optimizeDeps: {
    ...devAppOptimizeDeps,
    include: [...CORE_OPTIMIZE_DEPS, "@tanstack/react-router", "lucide-react"],
    // Only crawl the app shell — Vite otherwise picks up stray HTML (e.g. playwright-report).
    entries: [path.resolve(appRoot, "index.html")],
  },
  resolve: {
    alias: {
      "@": path.resolve(appRoot, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  plugins: [
    TanStackRouterVite({
      routesDirectory: "./src/routes",
      generatedRouteTree: "./src/routeTree.gen.ts",
    }),
    react(),
  ],
});
