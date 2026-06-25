import { Button } from "@dev-ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@dev-ui/components/card";
import { getBuiltInThemeIds, resolveThemeById } from "@dev-ui/tokens";
import { createFileRoute } from "@tanstack/react-router";
import styles from "@/modules/components-list/components-list.module.scss";

export const Route = createFileRoute("/themes")({
  component: ThemesPage,
});

const previewCardStyle = {
  padding: "1.25rem",
  border: "var(--card-border-width, 1px) solid var(--color-border)",
  borderRadius: "var(--card-radius)",
  background: "var(--surface-background, var(--color-bg))",
  boxShadow: "var(--card-shadow)",
  color: "var(--color-fg)",
} as const;

function ThemesPage() {
  const themeIds = getBuiltInThemeIds();

  return (
    <div className={styles.page}>
      <div>
        <h1 className={styles.pageTitle}>Themes</h1>
        <p className={styles.pageDescription}>
          Compare built-in themes in light and dark mode. Use the header
          controls to switch the global theme.
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
          {themeIds.map((themeId) => (
            <div
              key={`${themeId}-light`}
              data-theme={themeId}
              data-theme-mode="light"
              style={previewCardStyle}
            >
              <h3 style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
                {resolveThemeById(themeId).label}
              </h3>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
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
              <Card size="sm" style={{ marginTop: "0.75rem" }}>
                <CardHeader>
                  <CardTitle>Surface</CardTitle>
                </CardHeader>
                <CardContent>Soft extruded surface</CardContent>
              </Card>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2 className={styles.sectionTitle}>Dark mode</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))",
            gap: "1rem",
            marginTop: "1rem",
          }}
        >
          {themeIds.map((themeId) => (
            <div
              key={`${themeId}-dark`}
              data-theme={themeId}
              data-theme-mode="dark"
              style={previewCardStyle}
            >
              <h3 style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
                {resolveThemeById(themeId).label}
              </h3>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
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
              <Card size="sm" style={{ marginTop: "0.75rem" }}>
                <CardHeader>
                  <CardTitle>Surface</CardTitle>
                </CardHeader>
                <CardContent>Soft extruded surface</CardContent>
              </Card>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
