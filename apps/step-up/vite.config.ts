import { writeFileSync } from "node:fs";
import path, { resolve } from "node:path";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import {
  CORE_OPTIMIZE_DEPS,
  devAppOptimizeDeps,
} from "../../scripts/vite/dev-app";

const appRoot = import.meta.dirname;

function firebaseMessagingSwPlugin(env: Record<string, string>): Plugin {
  const generate = () => {
    const config = {
      apiKey: env.VITE_FIREBASE_API_KEY ?? "",
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
      projectId: env.VITE_FIREBASE_PROJECT_ID ?? "",
      appId: env.VITE_FIREBASE_APP_ID ?? "",
    };

    return `importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js");
firebase.initializeApp(${JSON.stringify(config)});
firebase.messaging().onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? "Step Up";
  const options = {
    body: payload.notification?.body ?? "",
    icon: "/icons/icon-192.png",
    data: payload.data ?? {},
  };
  self.registration.showNotification(title, options);
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/"));
});`;
  };

  return {
    name: "firebase-messaging-sw",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split("?")[0] === "/firebase-messaging-sw.js") {
          res.setHeader("Content-Type", "application/javascript");
          res.end(generate());
          return;
        }
        next();
      });
    },
    closeBundle() {
      writeFileSync(
        resolve(appRoot, "dist/firebase-messaging-sw.js"),
        generate(),
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, appRoot, "");
  return {
    server: {
      port: 5180,
      open: true,
    },
    optimizeDeps: {
      ...devAppOptimizeDeps,
      include: [
        ...CORE_OPTIMIZE_DEPS,
        "@tanstack/react-router",
        "@tanstack/react-query",
        "lucide-react",
        "motion/react",
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
        autoCodeSplitting: true,
      }),
      react(),
      firebaseMessagingSwPlugin(env),
      VitePWA({
        registerType: "prompt",
        injectRegister: false,
        includeAssets: [
          "favicon.svg",
          "favicon.ico",
          "apple-touch-icon.png",
          "icons/*.png",
        ],
        manifest: {
          name: "Step Up",
          short_name: "Step Up",
          description: "Dance studio ops — batches, plans, attendance, booking",
          start_url: "/",
          scope: "/",
          display: "standalone",
          orientation: "portrait-primary",
          background_color: "#F8F4EC",
          theme_color: "#F8F4EC",
          categories: ["business", "productivity"],
          icons: [
            {
              src: "icons/icon-192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "icons/icon-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "icons/icon-maskable-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
          globPatterns: ["**/*.{js,css,html,ico,svg,png,woff2,webmanifest}"],
          globIgnores: [
            "**/material-symbols-*/**",
            "**/material-symbols-*",
            "**/phosphor-*",
            "**/tabler-*",
            "**/heroicons-*",
            "**/fluent-*",
            "**/fira-code-*",
            "**/jetbrains-mono-*",
            "**/ibm-plex-mono-*",
            "**/montserrat-*",
            "**/lora-*",
            "**/plus-jakarta-sans-*",
            "**/source-serif-4-*",
          ],
          navigateFallback: "/index.html",
          navigateFallbackDenylist: [/^\/api/],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
  };
});
