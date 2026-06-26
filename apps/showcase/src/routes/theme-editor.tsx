import { Button } from "@dev-ui/components/button";
import { Card } from "@dev-ui/components/card";
import { Input } from "@dev-ui/components/input";
import { createFileRoute } from "@tanstack/react-router";
import { useTheme } from "@/lib/theme";
import styles from "@/modules/components-list/components-list.module.scss";

export const Route = createFileRoute("/theme-editor")({
  component: ThemeEditorPage,
});

function ThemeEditorPage() {
  const { mode, setMode } = useTheme();

  return (
    <div className={styles.page}>
      <div>
        <h1 className={styles.pageTitle}>Theme editor</h1>
        <p className={styles.pageDescription}>
          Use Edit theme in the header to open the drawer. Changes apply live
          across the showcase while the drawer is open and can be saved to your
          browser.
        </p>
      </div>

      <Card
        style={{
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Button
            variant={mode === "light" ? "primary" : "default"}
            size="sm"
            onClick={() => setMode("light")}
          >
            Light
          </Button>
          <Button
            variant={mode === "dark" ? "primary" : "default"}
            size="sm"
            onClick={() => setMode("dark")}
          >
            Dark
          </Button>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Button variant="primary">Primary</Button>
          <Button variant="default">Default</Button>
          <Button variant="quiet">Quiet</Button>
          <Button variant="danger">Danger</Button>
        </div>
        <Input aria-label="Preview input" placeholder="Preview input" />
      </Card>
    </div>
  );
}
