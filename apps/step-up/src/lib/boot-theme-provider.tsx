import { type ReactNode, useEffect, useLayoutEffect, useState } from "react";
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
 * Login no longer needs IconProvider before ThemeProvider (password toggle is
 * text). Protected shells wait on auth long enough for idle theme hydrate.
 */
export function BootThemeProvider({ children }: { children: ReactNode }) {
  const [mod, setMod] = useState<ThemeModule | null>(() => themeModule);

  useLayoutEffect(() => {
    applyDocumentTheme(window.location.pathname);
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
    return children;
  }

  return <mod.AppThemeProvider>{children}</mod.AppThemeProvider>;
}

export function preloadAppTheme() {
  return loadThemeModule();
}
