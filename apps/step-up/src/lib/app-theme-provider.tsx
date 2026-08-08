import { ThemeProvider, useTheme } from "@dev-ui/core";
import { useRouterState } from "@tanstack/react-router";
import { type ReactNode, useEffect, useLayoutEffect, useState } from "react";
import {
  getCachedLucidePack,
  getEmptyLucidePack,
  preloadLucidePack,
} from "@/lib/deferred-icon-pack";
import { isSoftThemePath } from "@/lib/theme-path";
import { StudioBrandEditProvider } from "@/modules/branding/studio-brand-edit-context";

const STAFF_THEME = "step-up";
const MEMBER_THEME = "step-up-soft";

function themeForPathname(pathname: string) {
  return isSoftThemePath(pathname) ? MEMBER_THEME : STAFF_THEME;
}

function EnsureSurfaceTheme({ children }: { children: ReactNode }) {
  const { theme, setTheme, liveTheme } = useTheme();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const desired = themeForPathname(pathname);

  useLayoutEffect(() => {
    if (liveTheme) return;
    if (theme !== desired) {
      setTheme(desired);
    }
  }, [theme, desired, setTheme, liveTheme]);

  return children;
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [iconPack, setIconPack] = useState(
    () => getCachedLucidePack() ?? getEmptyLucidePack(),
  );

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

  return (
    <ThemeProvider
      defaultTheme={STAFF_THEME}
      icons={{ library: "lucide" }}
      initialIconPack={iconPack}
      iconLoaders={{
        lucide: () => preloadLucidePack().then((pack) => ({ default: pack })),
      }}
    >
      <StudioBrandEditProvider>
        <EnsureSurfaceTheme>{children}</EnsureSurfaceTheme>
      </StudioBrandEditProvider>
    </ThemeProvider>
  );
}
