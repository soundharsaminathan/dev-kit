import { IconProvider } from "@dev-ui/icons";
import { type ReactNode, useEffect, useLayoutEffect, useState } from "react";
import {
  getCachedLucidePack,
  getEmptyLucidePack,
  preloadLucidePack,
} from "@/lib/deferred-icon-pack";
import { isSoftThemePath } from "@/lib/theme-path";

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
 * Protected shells render `<Icon>` immediately after auth (AppShell, metrics).
 * Phase 3 dropped the boot IconProvider assuming auth waited long enough for
 * idle theme hydrate — session-cache auth finishes first and crashed /app + /me
 * with "useIcons must be used within an IconProvider", leaving LCP on the
 * auth boot loader. Protected paths therefore:
 *   1) start theme load immediately (not idle)
 *   2) wrap with IconProvider until AppThemeProvider mounts
 * Public/login keep the idle path and skip IconProvider (text password toggle).
 */
export function BootThemeProvider({ children }: { children: ReactNode }) {
  const [mod, setMod] = useState<ThemeModule | null>(() => themeModule);
  const [iconPack, setIconPack] = useState(
    () => getCachedLucidePack() ?? getEmptyLucidePack(),
  );
  const [isPublic] = useState(() =>
    typeof window === "undefined"
      ? true
      : isPublicBootPath(window.location.pathname),
  );

  useLayoutEffect(() => {
    applyDocumentTheme(window.location.pathname);
  }, []);

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
        {children}
      </IconProvider>
    );
  }

  return <mod.AppThemeProvider>{children}</mod.AppThemeProvider>;
}

export function preloadAppTheme() {
  return loadThemeModule();
}
