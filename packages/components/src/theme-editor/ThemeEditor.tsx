import { cn } from "@dev-ui/core";
import { resolveThemeDraft, themeToCss } from "@dev-ui/tokens";
import { useLayoutEffect, useMemo } from "react";
import { ThemeEditorPanel } from "./ThemeEditorPanel";
import styles from "./theme-editor.module.scss";
import type { ThemeEditorProps } from "./theme-editor.types";

const PREVIEW_STYLE_ID = "dev-ui-theme-editor-preview";

/** Inline theme editor panel. Prefer ThemeEditorDrawer for live app editing. */
function ThemeEditor({
  value,
  onChange,
  previewThemeId,
  className,
  children,
}: ThemeEditorProps) {
  const resolved = useMemo(() => resolveThemeDraft(value), [value]);

  useLayoutEffect(() => {
    if (!previewThemeId || typeof document === "undefined") return;

    const css = themeToCss(resolved, previewThemeId);
    const existing = document.getElementById(PREVIEW_STYLE_ID);
    const style =
      existing ??
      Object.assign(document.createElement("style"), { id: PREVIEW_STYLE_ID });
    style.textContent = css;
    if (!existing) {
      document.head.appendChild(style);
    }

    return () => {
      document.getElementById(PREVIEW_STYLE_ID)?.remove();
    };
  }, [previewThemeId, resolved]);

  return (
    <div className={cn(styles.root, className)}>
      <ThemeEditorPanel value={value} onChange={onChange} />
      {children}
    </div>
  );
}

export type {
  ThemeEditorDrawerProps,
  ThemeEditorPanelProps,
  ThemeEditorProps,
} from "./theme-editor.types";
export { ThemeEditor };
