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

/**
 * Built-in themes already live in SCSS. Avoid pulling colorjs.io + theme JS
 * onto the first paint of public routes; hydrate the full ThemeProvider idle.
 *
 * IconProvider must wrap the tree immediately: PasswordInput and other UI use
 * `<Icon>` before AppThemeProvider finishes idle-loading.
 */
export function BootThemeProvider({ children }: { children: ReactNode }) {
  const [mod, setMod] = useState<ThemeModule | null>(() => themeModule);
  const [iconPack, setIconPack] = useState(
    () => getCachedLucidePack() ?? getEmptyLucidePack(),
  );

  useLayoutEffect(() => {
    applyDocumentTheme(window.location.pathname);
  }, []);

  useEffect(() => {
    if (getCachedLucidePack()) {
      return;
    }
    const schedule =
      typeof requestIdleCallback === "function"
        ? (cb: () => void) => {
            const id = requestIdleCallback(() => cb(), { timeout: 2000 });
            return () => cancelIdleCallback(id);
          }
        : (cb: () => void) => {
            const id = window.setTimeout(cb, 1);
            return () => window.clearTimeout(id);
          };

    return schedule(() => {
      void preloadLucidePack().then((pack) => {
        setIconPack(pack);
      });
    });
  }, []);

  useEffect(() => {
    if (mod) {
      return;
    }

    const schedule =
      typeof requestIdleCallback === "function"
        ? (cb: () => void) => {
            const id = requestIdleCallback(() => cb(), { timeout: 1800 });
            return () => cancelIdleCallback(id);
          }
        : (cb: () => void) => {
            const id = window.setTimeout(cb, 1);
            return () => window.clearTimeout(id);
          };

    return schedule(() => {
      void loadThemeModule().then((loaded) => {
        setMod(loaded);
      });
    });
  }, [mod]);

  if (!mod) {
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
