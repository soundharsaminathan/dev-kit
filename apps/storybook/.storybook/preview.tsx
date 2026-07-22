import { OverlayProvider } from "@dev-ui/components/popover";
import { IconProvider, packLibraries, resolveIconTheme } from "@dev-ui/icons";
import { defaultPackLoaders } from "@dev-ui/icons/loaders";
import lucidePack from "@dev-ui/icons-packs/lucide";
import type { Preview } from "@storybook/react-vite";
import MockDate from "mockdate";
import { initialize, mswLoader } from "msw-storybook-addon";
import React, { type ReactNode, useLayoutEffect } from "react";
import "@dev-ui/tokens/fonts";
import "@dev-ui/tokens/scss";
import "@dev-ui/components/styles";
import "./preview.css";
import {
  ACTIVE_THEME_STORAGE_KEY,
  getBuiltInThemeIds,
  THEME_MODE_STORAGE_KEY,
} from "@dev-ui/tokens";
import { mswHandlers } from "./msw-handlers";

initialize({ onUnhandledRequest: "bypass" });

const themeIds = getBuiltInThemeIds();
const themeItems = themeIds.map((themeId) => ({
  value: themeId,
  title: themeId.charAt(0).toUpperCase() + themeId.slice(1),
}));

const modeItems = [
  { value: "light", title: "Light", icon: "sun" as const },
  { value: "dark", title: "Dark", icon: "moon" as const },
];

const iconPackItems = packLibraries.map((pack) => ({
  value: pack.id,
  title: pack.label,
}));

function IconPackSync({
  iconPack,
  children,
}: {
  iconPack: string;
  children: ReactNode;
}) {
  const iconTheme = resolveIconTheme(iconPack);

  return (
    <IconProvider
      icons={iconTheme}
      initialPack={lucidePack}
      loaders={defaultPackLoaders}
    >
      {children}
    </IconProvider>
  );
}
function ThemeSync({
  theme,
  mode,
  children,
}: {
  theme: string;
  mode: string;
  children: ReactNode;
}) {
  if (typeof document !== "undefined") {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.setAttribute("data-theme-mode", mode);
  }

  useLayoutEffect(() => {
    localStorage.setItem(ACTIVE_THEME_STORAGE_KEY, theme);
    localStorage.setItem(THEME_MODE_STORAGE_KEY, mode);
  }, [theme, mode]);

  return children;
}

const preview: Preview = {
  loaders: [mswLoader],
  parameters: {
    msw: { handlers: mswHandlers },
  },
  async beforeEach() {
    localStorage.setItem(ACTIVE_THEME_STORAGE_KEY, "default");
    localStorage.setItem(THEME_MODE_STORAGE_KEY, "light");
    document.documentElement.setAttribute("data-theme", "default");
    document.documentElement.setAttribute("data-theme-mode", "light");
    MockDate.set("2024-04-01T12:00:00Z");
  },
  globalTypes: {
    theme: {
      description: "Visual theme",
      toolbar: {
        title: "Theme",
        icon: "paintbrush",
        items: themeItems,
        dynamicTitle: true,
      },
    },
    themeMode: {
      description: "Light or dark mode",
      toolbar: {
        title: "Mode",
        icon: "circlehollow",
        items: modeItems,
        dynamicTitle: true,
      },
    },
    iconPack: {
      description: "Icon library",
      toolbar: {
        title: "Icons",
        icon: "component",
        items: iconPackItems,
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: "default",
    themeMode: "light",
    iconPack: "lucide",
    a11y: {
      manual: true,
    },
  },
  decorators: [
    (Story, context) => {
      const theme = (context.globals.theme as string) ?? "default";
      const mode = (context.globals.themeMode as string) ?? "light";
      const iconPack = (context.globals.iconPack as string) ?? "lucide";
      return (
        <IconPackSync iconPack={iconPack}>
          <ThemeSync theme={theme} mode={mode}>
            <OverlayProvider>
              <div
                style={{
                  boxSizing: "border-box",
                  padding: "1rem",
                  background: "var(--color-bg)",
                  color: "var(--color-fg)",
                  height: "100%",
                }}
              >
                <Story />
              </div>
            </OverlayProvider>
          </ThemeSync>
        </IconPackSync>
      );
    },
  ],
};

export default preview;
