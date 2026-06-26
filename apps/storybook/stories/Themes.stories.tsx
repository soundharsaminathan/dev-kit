import { Button } from "@dev-ui/components/button";
import { getBuiltInThemeIds, resolveThemeById } from "@dev-ui/tokens";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Foundation/Themes",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const ThemeShowcase: Story = {
  render: () => {
    const themeIds = getBuiltInThemeIds();

    return (
      <div style={{ padding: "2rem" }}>
        <h1
          style={{ marginBottom: "2rem", fontSize: "2rem", fontWeight: "bold" }}
        >
          Theme Showcase
        </h1>
        <p style={{ marginBottom: "3rem", color: "var(--color-fg-muted)" }}>
          Use the toolbar controls above to switch between themes and modes.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "2rem",
            marginBottom: "3rem",
          }}
        >
          {themeIds.map((themeId) => {
            const theme = resolveThemeById(themeId);
            return (
              <div
                key={themeId}
                style={{
                  padding: "1.5rem",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-lg)",
                  background: "var(--color-bg)",
                  color: "var(--color-fg)",
                }}
              >
                <h2 style={{ marginBottom: "1rem", fontWeight: 600 }}>
                  {theme.label}
                </h2>
                <div
                  style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
                >
                  <Button variant="primary" size="sm">
                    Primary
                  </Button>
                  <Button variant="default" size="sm">
                    Default
                  </Button>
                  <Button variant="quiet" size="sm">
                    Quiet
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  },
};

export const LightModeComparison: Story = {
  render: () => {
    const themeIds = getBuiltInThemeIds();

    return (
      <div style={{ padding: "2rem" }}>
        <h1
          style={{ marginBottom: "2rem", fontSize: "1.5rem", fontWeight: 600 }}
        >
          Light mode comparison
        </h1>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))",
            gap: "1rem",
          }}
        >
          {themeIds.map((themeId) => (
            <div
              key={themeId}
              data-theme={themeId}
              data-theme-mode="light"
              style={{
                padding: "1.25rem",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-lg)",
                background: "var(--color-bg)",
                color: "var(--color-fg)",
              }}
            >
              <h3 style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
                {resolveThemeById(themeId).label}
              </h3>
              <Button variant="primary" size="sm">
                Primary
              </Button>
            </div>
          ))}
        </div>
      </div>
    );
  },
};

export const DarkModeComparison: Story = {
  render: () => {
    const themeIds = getBuiltInThemeIds();

    return (
      <div style={{ padding: "2rem" }}>
        <h1
          style={{ marginBottom: "2rem", fontSize: "1.5rem", fontWeight: 600 }}
        >
          Dark mode comparison
        </h1>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))",
            gap: "1rem",
          }}
        >
          {themeIds.map((themeId) => (
            <div
              key={themeId}
              data-theme={themeId}
              data-theme-mode="dark"
              style={{
                padding: "1.25rem",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-lg)",
                background: "var(--color-bg)",
                color: "var(--color-fg)",
              }}
            >
              <h3 style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
                {resolveThemeById(themeId).label}
              </h3>
              <Button variant="primary" size="sm">
                Primary
              </Button>
            </div>
          ))}
        </div>
      </div>
    );
  },
};
