import { ThemeProvider, useTheme } from "@dev-ui/core";
import { type ReactNode, useEffect, useLayoutEffect, useState } from "react";
import { APP_THEME } from "@/lib/app-theme";
import {
  getCachedLucidePack,
  getEmptyLucidePack,
  preloadLucidePack,
} from "@/lib/deferred-icon-pack";

export { APP_THEME };

function EnsureAppTheme({ children }: { children: ReactNode }) {
  const { theme, setTheme } = useTheme();

  useLayoutEffect(() => {
    if (theme !== APP_THEME) {
      setTheme(APP_THEME);
    }
  }, [theme, setTheme]);

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
      defaultTheme={APP_THEME}
      icons={{ library: "lucide" }}
      initialIconPack={iconPack}
      iconLoaders={{
        lucide: () => preloadLucidePack().then((pack) => ({ default: pack })),
      }}
    >
      <EnsureAppTheme>{children}</EnsureAppTheme>
    </ThemeProvider>
  );
}
