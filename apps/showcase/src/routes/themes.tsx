import { Button } from "@dev-ui/components/button";
import { getThemePreset, getThemePresetNames } from "@dev-ui/tokens";
import { createFileRoute } from "@tanstack/react-router";
import styles from "@/modules/components-list/components-list.module.scss";

export const Route = createFileRoute("/themes")({
  component: ThemesPage,
});

function ThemesPage() {
  const presets = getThemePresetNames();

  return (
    <div className={styles.page}>
      <div>
        <h1 className={styles.pageTitle}>Theme presets</h1>
        <p className={styles.pageDescription}>
          Compare all presets in light and dark mode. Use the header controls to
          switch the global theme.
        </p>
      </div>

      <section>
        <h2 className={styles.sectionTitle}>Light mode</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))",
            gap: "1rem",
            marginTop: "1rem",
          }}
        >
          {presets.map((presetName) => (
            <div
              key={`${presetName}-light`}
              data-theme-preset={presetName}
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
      </section>

      <section>
        <h2 className={styles.sectionTitle}>Dark mode</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))",
            gap: "1rem",
            marginTop: "1rem",
          }}
        >
          {presets.map((presetName) => (
            <div
              key={`${presetName}-dark`}
              data-theme-preset={presetName}
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
      </section>
    </div>
  );
}
