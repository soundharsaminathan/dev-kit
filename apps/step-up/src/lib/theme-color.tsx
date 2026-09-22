import { useEffect } from "react";

const LIGHT_THEME_COLOR = "#F8F4EC";
const DARK_THEME_COLOR = "oklch(0.13 0.005 78)";

function themeColorForMode(mode: string | null) {
  return mode === "dark" ? DARK_THEME_COLOR : LIGHT_THEME_COLOR;
}

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

    const sync = () => {
      meta.content = themeColorForMode(
        document.documentElement.getAttribute("data-theme-mode"),
      );
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme-mode"],
    });
    return () => observer.disconnect();
  }, []);

  return null;
}
