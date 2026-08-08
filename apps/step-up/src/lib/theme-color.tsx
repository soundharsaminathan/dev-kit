import { useEffect } from "react";

const APP_THEME_COLOR = "#F8F4EC";

/**
 * Keep the browser chrome color in sync without requiring ThemeProvider —
 * public first paint may render before the deferred theme module loads.
 */
export function ThemeColorSync() {
  useEffect(() => {
    let meta = document.querySelector(
      'meta[name="theme-color"]:not([media])',
    ) as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = APP_THEME_COLOR;
  }, []);

  return null;
}
