import { Button } from "@dev-ui/components/button";
import { getThemePreset, getThemePresetNames } from "@dev-ui/tokens";
import type { Meta, StoryObj } from "@storybook/react";

const meta = {
  title: "Foundation/Themes",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Theme showcase displaying all available theme presets in both light and dark modes.
 * Use the Storybook toolbar controls to switch between presets and modes.
 */
export const ThemeShowcase: Story = {
  render: () => {
    const presets = getThemePresetNames();

    return (
      <div style={{ padding: "2rem" }}>
        <h1
          style={{ marginBottom: "2rem", fontSize: "2rem", fontWeight: "bold" }}
        >
          Theme Presets Showcase
        </h1>
        <p style={{ marginBottom: "3rem", color: "var(--color-fg-muted)" }}>
          Use the toolbar controls above to switch between theme presets and
          modes. Each preset supports both light and dark variants.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "2rem",
            marginBottom: "3rem",
          }}
        >
          {presets.map((presetName) => {
            const preset = getThemePreset(presetName);
            return (
              <div
                key={presetName}
                style={{
                  padding: "1.5rem",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-lg)",
                  background: "var(--color-card)",
                }}
              >
                <h2
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: "600",
                    marginBottom: "0.5rem",
                  }}
                >
                  {preset.label}
                </h2>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--color-fg-muted)",
                    marginBottom: "1rem",
                  }}
                >
                  {presetName}
                </p>
                <div
                  style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
                >
                  <Button variant="primary" size="sm">
                    Primary
                  </Button>
                  <Button variant="default" size="sm">
                    Default
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            padding: "2rem",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
            background: "var(--color-card)",
          }}
        >
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: "600",
              marginBottom: "1rem",
            }}
          >
            Component Examples
          </h2>
          <div
            style={{
              display: "flex",
              gap: "1rem",
              flexWrap: "wrap",
              marginBottom: "1rem",
            }}
          >
            <Button variant="primary">Primary Button</Button>
            <Button variant="default">Default Button</Button>
            <Button variant="primary" disabled>
              Disabled
            </Button>
          </div>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <Button variant="primary" size="sm">
              Small
            </Button>
            <Button variant="primary" size="md">
              Medium
            </Button>
            <Button variant="primary" size="lg">
              Large
            </Button>
          </div>
        </div>
      </div>
    );
  },
};

/**
 * Compare all themes side by side in light mode
 */
export const LightModeComparison: Story = {
  render: () => {
    const presets = getThemePresetNames();

    return (
      <div style={{ padding: "2rem" }}>
        <h1
          style={{ marginBottom: "2rem", fontSize: "2rem", fontWeight: "bold" }}
        >
          Light Mode Comparison
        </h1>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {presets.map((presetName) => (
            <div
              key={presetName}
              data-theme-preset={presetName}
              data-theme-mode="light"
              style={{
                padding: "1.5rem",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-lg)",
                background: "var(--color-bg)",
                color: "var(--color-fg)",
              }}
            >
              <h3 style={{ marginBottom: "1rem", fontWeight: "600" }}>
                {getThemePreset(presetName).label}
              </h3>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <Button variant="primary" size="sm">
                  Primary
                </Button>
                <Button variant="default" size="sm">
                  Default
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  },
};

/**
 * Compare all themes side by side in dark mode
 */
export const DarkModeComparison: Story = {
  render: () => {
    const presets = getThemePresetNames();

    return (
      <div style={{ padding: "2rem" }}>
        <h1
          style={{ marginBottom: "2rem", fontSize: "2rem", fontWeight: "bold" }}
        >
          Dark Mode Comparison
        </h1>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {presets.map((presetName) => (
            <div
              key={presetName}
              data-theme-preset={presetName}
              data-theme-mode="dark"
              style={{
                padding: "1.5rem",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-lg)",
                background: "var(--color-bg)",
                color: "var(--color-fg)",
              }}
            >
              <h3 style={{ marginBottom: "1rem", fontWeight: "600" }}>
                {getThemePreset(presetName).label}
              </h3>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <Button variant="primary" size="sm">
                  Primary
                </Button>
                <Button variant="default" size="sm">
                  Default
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  },
};
