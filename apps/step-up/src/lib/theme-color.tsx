import { useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { isSoftThemePath, useTheme } from "@/lib/theme";

const STAFF_THEME_COLOR = "#0a84ff";
const MEMBER_THEME_COLOR = "#F8F4EC";

export function ThemeColorSync() {
  const { mode } = useTheme();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isSoft = isSoftThemePath(pathname);

  useEffect(() => {
    const color = isSoft ? MEMBER_THEME_COLOR : STAFF_THEME_COLOR;
    void mode;
    let meta = document.querySelector(
      'meta[name="theme-color"]:not([media])',
    ) as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = color;
  }, [mode, isSoft]);

  return null;
}
