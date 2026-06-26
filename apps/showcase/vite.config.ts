import path from "node:path";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { devAppOptimizeDeps } from "../../scripts/vite/dev-app";

export default defineConfig({
  server: {
    port: 5173,
  },
  optimizeDeps: {
    ...devAppOptimizeDeps,
    // Only crawl the app shell — Vite otherwise picks up stray HTML (e.g. playwright-report).
    entries: [path.resolve(import.meta.dirname, "index.html")],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  plugins: [
    TanStackRouterVite({
      routesDirectory: "./src/routes",
      generatedRouteTree: "./src/routeTree.gen.ts",
    }),
    react(),
  ],
});
