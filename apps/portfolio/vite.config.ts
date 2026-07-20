import path from "node:path";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import {
  CORE_OPTIMIZE_DEPS,
  devAppOptimizeDeps,
} from "../../scripts/vite/dev-app";
import { portfolioAgentApiPlugin } from "./server/agentApiPlugin";

const appRoot = import.meta.dirname;

export default defineConfig(({ mode }) => {
  // Expose GROQ_API_KEY to the Vite Node process for the agent middleware
  const env = loadEnv(mode, appRoot, "");
  if (env.GROQ_API_KEY) {
    process.env.GROQ_API_KEY = env.GROQ_API_KEY;
  }

  return {
    server: {
      port: 5174,
    },
    preview: {
      port: 4174,
    },
    optimizeDeps: {
      ...devAppOptimizeDeps,
      include: [
        ...CORE_OPTIMIZE_DEPS,
        "@tanstack/react-router",
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
      TanStackRouterVite({
        routesDirectory: "./src/routes",
        generatedRouteTree: "./src/routeTree.gen.ts",
      }),
      react(),
      portfolioAgentApiPlugin(),
    ],
  };
});
