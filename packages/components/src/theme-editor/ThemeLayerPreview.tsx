import type { TokenLayerKey } from "@dev-ui/tokens";
import styles from "./theme-editor.module.scss";

export type ThemeSectionKey = "color" | TokenLayerKey;

interface ThemeLayerPreviewProps {
  section: ThemeSectionKey;
}

function ThemeLayerPreview({ section }: ThemeLayerPreviewProps) {
  switch (section) {
    case "color":
      return (
        <section
          className={styles.preview}
          aria-label="Color preview"
          data-section="color"
        >
          <div className={styles.previewSwatches}>
            <span
              className={styles.previewSwatch}
              style={{ backgroundColor: "var(--color-primary)" }}
              title="Primary"
            />
            <span
              className={styles.previewSwatch}
              style={{ backgroundColor: "var(--color-accent)" }}
              title="Accent"
            />
            <span
              className={styles.previewSwatch}
              style={{ backgroundColor: "var(--color-success)" }}
              title="Success"
            />
            <span
              className={styles.previewSwatch}
              style={{ backgroundColor: "var(--color-warning)" }}
              title="Warning"
            />
            <span
              className={styles.previewSwatch}
              style={{ backgroundColor: "var(--color-danger)" }}
              title="Danger"
            />
            <span
              className={styles.previewSwatch}
              style={{ backgroundColor: "var(--color-info)" }}
              title="Info"
            />
          </div>
        </section>
      );

    case "foundation":
      return (
        <section
          className={styles.preview}
          aria-label="Foundation preview"
          data-section="foundation"
        >
          <div className={styles.previewRadiusRow}>
            <span className={styles.previewRadiusSm} />
            <span className={styles.previewRadiusMd} />
            <span className={styles.previewRadiusLg} />
          </div>
          <div className={styles.previewTypeRow}>
            <span className={styles.previewTextSm}>Aa</span>
            <span className={styles.previewTextMd}>Aa</span>
            <span className={styles.previewTextLg}>Aa</span>
          </div>
          <div className={styles.previewSpacingRow}>
            <span className={styles.previewSpacingDot} />
            <span className={styles.previewSpacingDot} />
            <span className={styles.previewSpacingDot} />
          </div>
        </section>
      );

    case "semantic":
      return (
        <section
          className={styles.preview}
          aria-label="Semantic preview"
          data-section="semantic"
        >
          <div className={styles.previewSemanticSurfaces}>
            <div className={styles.previewSurfacePrimary}>Primary surface</div>
            <div className={styles.previewSurfaceSecondary}>
              Secondary surface
            </div>
          </div>
          <div className={styles.previewSemanticText}>
            <span className={styles.previewTextPrimary}>Primary text</span>
            <span className={styles.previewTextSecondary}>Muted text</span>
          </div>
        </section>
      );

    case "effects":
      return (
        <section
          className={styles.preview}
          aria-label="Effects preview"
          data-section="effects"
        >
          <div className={styles.previewShadowRow}>
            <span className={styles.previewShadowSm} />
            <span className={styles.previewShadowMd} />
            <span className={styles.previewShadowLg} />
          </div>
        </section>
      );

    case "interaction":
      return (
        <section
          className={styles.preview}
          aria-label="Interaction preview"
          data-section="interaction"
        >
          <button type="button" className={styles.previewFocusTarget}>
            Focus me
          </button>
        </section>
      );

    case "components":
      return (
        <section
          className={styles.preview}
          aria-label="Components preview"
          data-section="components"
        >
          <div className={styles.previewComponentsRow}>
            <span className={styles.previewMiniButton}>Button</span>
            <span className={styles.previewMiniInput}>Input</span>
          </div>
        </section>
      );
  }
}

export { ThemeLayerPreview };
