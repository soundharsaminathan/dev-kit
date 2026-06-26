import { OverlayProvider } from "@dev-ui/components/popover";
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
  },
  initialGlobals: {
    theme: "default",
    themeMode: "light",
    a11y: {
      manual: true,
    },
  },
  decorators: [
    (Story, context) => {
      const theme = (context.globals.theme as string) ?? "default";
      const mode = (context.globals.themeMode as string) ?? "light";
      return (
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
      );
    },
  ],
};

export default preview;
