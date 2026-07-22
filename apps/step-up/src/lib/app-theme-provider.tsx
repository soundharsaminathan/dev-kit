import { ThemeProvider, useTheme } from "@dev-ui/core";
import lucidePack from "@dev-ui/icons-packs/lucide";
import { useRouterState } from "@tanstack/react-router";
import { type ReactNode, useLayoutEffect } from "react";
import { isSoftThemePath } from "@/lib/theme-path";

const STAFF_THEME = "step-up";
const MEMBER_THEME = "step-up-soft";

function themeForPathname(pathname: string) {
  return isSoftThemePath(pathname) ? MEMBER_THEME : STAFF_THEME;
}

function EnsureSurfaceTheme({ children }: { children: ReactNode }) {
  const { theme, setTheme } = useTheme();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const desired = themeForPathname(pathname);

  useLayoutEffect(() => {
    if (theme !== desired) {
      setTheme(desired);
    }
  }, [theme, desired, setTheme]);

  return children;
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      defaultTheme={STAFF_THEME}
      icons={{ library: "lucide" }}
      initialIconPack={lucidePack}
      iconLoaders={{}}
    >
      <EnsureSurfaceTheme>{children}</EnsureSurfaceTheme>
    </ThemeProvider>
  );
}
