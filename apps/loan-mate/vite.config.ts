import path from "node:path";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import {
  CORE_OPTIMIZE_DEPS,
  devAppOptimizeDeps,
} from "../../scripts/vite/dev-app";

const appRoot = import.meta.dirname;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, appRoot, "");
  const authBypassExplicit =
    process.env.VITE_AUTH_BYPASS ?? env.VITE_AUTH_BYPASS;
  const authBypass =
    authBypassExplicit === "true" ||
    (mode === "development" && authBypassExplicit !== "false");

  return {
    server: {
      port: 5181,
    },
    define: {
      "import.meta.env.VITE_AUTH_BYPASS": JSON.stringify(
        authBypass ? "true" : "false",
      ),
      "import.meta.env.VITE_API_URL": JSON.stringify(
        env.VITE_API_URL ||
          process.env.VITE_API_URL ||
          "http://localhost:3010",
      ),
    },
    optimizeDeps: {
      ...devAppOptimizeDeps,
      include: [
        ...CORE_OPTIMIZE_DEPS,
        "@tanstack/react-router",
        "@tanstack/react-query",
        "lucide-react",
      ],
      entries: [path.resolve(appRoot, "index.html")],
    },
    resolve: {
      alias: {
        "@": path.resolve(appRoot, "src"),
      },
      dedupe: ["react", "react-dom"],
    },
    plugins: [
      tanstackRouter({
        target: "react",
        routesDirectory: "./src/routes",
        generatedRouteTree: "./src/routeTree.gen.ts",
        routeFileIgnorePattern: "\\.test\\.",
        autoCodeSplitting: true,
      }),
      react(),
    ],
  };
});
