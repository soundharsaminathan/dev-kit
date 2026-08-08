import { IconProvider } from "@dev-ui/icons";
import { useRouterState } from "@tanstack/react-router";
import { type ReactNode, useEffect, useLayoutEffect, useState } from "react";
import {
  getCachedLucidePack,
  getEmptyLucidePack,
  preloadLucidePack,
} from "@/lib/deferred-icon-pack";
import { isSoftThemePath } from "@/lib/theme-path";
import { AuthBootLoader } from "@/modules/ui/auth-boot-loader";

const STAFF_THEME = "step-up";
const MEMBER_THEME = "step-up-soft";

function applyDocumentTheme(pathname: string) {
  const theme = isSoftThemePath(pathname) ? MEMBER_THEME : STAFF_THEME;
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  if (!root.getAttribute("data-theme-mode")) {
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    root.setAttribute("data-theme-mode", prefersDark ? "dark" : "light");
  }
}

function isPublicBootPath(pathname: string) {
  if (pathname === "/" || pathname === "") return true;
  return (
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/join") ||
    pathname.startsWith("/studio/")
  );
}

type ThemeModule = typeof import("./app-theme-provider");

let themeModule: ThemeModule | null = null;
let themePromise: Promise<ThemeModule> | null = null;

function loadThemeModule() {
  themePromise ??= import("./app-theme-provider").then((mod) => {
    themeModule = mod;
    return mod;
  });
  return themePromise;
}

function scheduleIdle(cb: () => void) {
  if (typeof requestIdleCallback === "function") {
    const id = requestIdleCallback(() => cb(), { timeout: 1800 });
    return () => cancelIdleCallback(id);
  }
  const id = window.setTimeout(cb, 1);
  return () => window.clearTimeout(id);
}

/**
 * Built-in themes already live in SCSS. Avoid pulling colorjs.io + theme JS
 * onto the first paint of public routes; hydrate the full ThemeProvider idle.
 *
 * Protected routes must not mount the outlet under a temporary IconProvider and
 * later swap to AppThemeProvider — that remounts forms and also breaks
 * `useTheme` (admin wizard, branding). Hold a light boot loader until the
 * theme chunk is ready, then mount children once under AppThemeProvider.
 */
export function BootThemeProvider({ children }: { children: ReactNode }) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isPublic = isPublicBootPath(pathname);
  const [mod, setMod] = useState<ThemeModule | null>(() => themeModule);
  const [iconPack, setIconPack] = useState(
    () => getCachedLucidePack() ?? getEmptyLucidePack(),
  );

  useLayoutEffect(() => {
    applyDocumentTheme(pathname);
  }, [pathname]);

  useEffect(() => {
    if (mod) {
      return;
    }

    if (!isPublic) {
      void loadThemeModule().then((loaded) => {
        setMod(loaded);
      });
      return;
    }

    return scheduleIdle(() => {
      void loadThemeModule().then((loaded) => {
        setMod(loaded);
      });
    });
  }, [mod, isPublic]);

  useEffect(() => {
    if (isPublic || getCachedLucidePack()) {
      return;
    }
    return scheduleIdle(() => {
      void preloadLucidePack().then((pack) => {
        setIconPack(pack);
      });
    });
  }, [isPublic]);

  if (!mod) {
    if (isPublic) {
      return children;
    }
    return (
      <IconProvider icons={{ library: "lucide" }} initialPack={iconPack}>
        <AuthBootLoader label="Loading app" caption="Warming up the studio…" />
      </IconProvider>
    );
  }

  return <mod.AppThemeProvider>{children}</mod.AppThemeProvider>;
}

export function preloadAppTheme() {
  return loadThemeModule();
}
