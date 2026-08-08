import { useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { isSoftThemePath } from "@/lib/theme-path";

const STAFF_THEME_COLOR = "#0a84ff";
const MEMBER_THEME_COLOR = "#F8F4EC";

/**
 * Keep the browser chrome color in sync without requiring ThemeProvider —
 * public first paint may render before the deferred theme module loads.
 */
export function ThemeColorSync() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isSoft = isSoftThemePath(pathname);

  useEffect(() => {
    const color = isSoft ? MEMBER_THEME_COLOR : STAFF_THEME_COLOR;
    let meta = document.querySelector(
      'meta[name="theme-color"]:not([media])',
    ) as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = color;
  }, [isSoft]);

  return null;
}
