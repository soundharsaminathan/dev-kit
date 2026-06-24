import { OverlayProvider } from "@dev-ui/components/popover";
import type { Preview } from "@storybook/react-vite";
import MockDate from "mockdate";
import { initialize, mswLoader } from "msw-storybook-addon";
import React, { type ReactNode, useLayoutEffect } from "react";
import "@dev-ui/tokens/fonts";
import "@dev-ui/tokens/scss";
import "@dev-ui/components/styles";
import "./preview.css";
import { getThemePresetNames } from "@dev-ui/tokens";
import { mswHandlers } from "./msw-handlers";

initialize({ onUnhandledRequest: "bypass" });

const themePresets = getThemePresetNames();
const presetItems = themePresets.map((preset) => ({
  value: preset,
  title: preset
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" "),
}));

const modeItems = [
  { value: "light", title: "Light", icon: "sun" as const },
  { value: "dark", title: "Dark", icon: "moon" as const },
];

/** Sync preset + mode toolbar globals to document root data attributes */
function ThemeSync({
  preset,
  mode,
  children,
}: {
  preset: string;
  mode: string;
  children: ReactNode;
}) {
  // Apply immediately so Storybook play functions see the correct theme
  // (useLayoutEffect alone runs after the first paint / play tick).
  if (typeof document !== "undefined") {
    const root = document.documentElement;
    root.setAttribute("data-theme-preset", preset);
    root.setAttribute("data-theme-mode", mode);
  }

  useLayoutEffect(() => {
    localStorage.setItem("theme-preset", preset);
    localStorage.setItem("theme-mode", mode);
  }, [preset, mode]);

  return children;
}

const preview: Preview = {
  loaders: [mswLoader],
  parameters: {
    msw: { handlers: mswHandlers },
  },
  async beforeEach() {
    localStorage.setItem("theme-preset", "modern-minimal");
    localStorage.setItem("theme-mode", "light");
    document.documentElement.setAttribute(
      "data-theme-preset",
      "modern-minimal",
    );
    document.documentElement.setAttribute("data-theme-mode", "light");
    MockDate.set("2024-04-01T12:00:00Z");
  },
  globalTypes: {
    themePreset: {
      description: "Color palette preset",
      toolbar: {
        title: "Preset",
        icon: "paintbrush",
        items: presetItems,
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
    themePreset: "modern-minimal",
    themeMode: "light",
    // Playwright e2e runs its own axe scans via @axe-core/playwright; disable
    // addon auto-runs to avoid conflicting axe-core versions on window.axe.
    a11y: {
      manual: true,
    },
  },
  decorators: [
    (Story, context) => {
      const preset =
        (context.globals.themePreset as string) ?? "modern-minimal";
      const mode = (context.globals.themeMode as string) ?? "light";
      return (
        <ThemeSync preset={preset} mode={mode}>
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
