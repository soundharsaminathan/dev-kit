import {
  resolveTheme,
  type ThemeDefinition,
  type ThemeDraft,
  themeDraftToDefinition,
  themeToCss,
} from "@dev-ui/tokens";
import { useCallback, useLayoutEffect, useRef } from "react";

export const THEME_EDITOR_LIVE_ID = "custom-live";
const LIVE_STYLE_ID = "dev-ui-theme-editor-live";

function applyDirectLivePreview(
  definition: ThemeDefinition | null,
  previousThemeId: string | null,
): void {
  if (typeof document === "undefined") return;

  const existing = document.getElementById(LIVE_STYLE_ID);
  if (!definition) {
    existing?.remove();
    if (previousThemeId) {
      document.documentElement.setAttribute("data-theme", previousThemeId);
    }
    return;
  }

  const css = themeToCss(resolveTheme(definition), definition.id);
  const style =
    existing ??
    Object.assign(document.createElement("style"), { id: LIVE_STYLE_ID });
  style.textContent = css;
  if (!existing) {
    document.head.appendChild(style);
  }

  document.documentElement.setAttribute("data-theme", definition.id);
}

export function draftToLiveDefinition(draft: ThemeDraft): ThemeDefinition {
  return themeDraftToDefinition(draft, THEME_EDITOR_LIVE_ID);
}

export function useThemeEditorLivePreview(
  onLivePreview?: ((definition: ThemeDefinition | null) => void) | undefined,
) {
  const previousThemeIdRef = useRef<string | null>(null);

  const applyLivePreview = useCallback(
    (draft: ThemeDraft | null) => {
      const definition = draft ? draftToLiveDefinition(draft) : null;
      if (onLivePreview) {
        onLivePreview(definition);
        return;
      }

      if (definition && previousThemeIdRef.current === null) {
        previousThemeIdRef.current =
          document.documentElement.getAttribute("data-theme");
      }

      applyDirectLivePreview(definition, previousThemeIdRef.current);

      if (!definition) {
        previousThemeIdRef.current = null;
      }
    },
    [onLivePreview],
  );

  const clearLivePreview = useCallback(() => {
    applyLivePreview(null);
  }, [applyLivePreview]);

  return { applyLivePreview, clearLivePreview };
}

export function useThemeEditorLivePreviewEffect(
  draft: ThemeDraft,
  isActive: boolean,
  onLivePreview?: ((definition: ThemeDefinition | null) => void) | undefined,
) {
  const { applyLivePreview, clearLivePreview } =
    useThemeEditorLivePreview(onLivePreview);

  useLayoutEffect(() => {
    if (!isActive) {
      clearLivePreview();
      return;
    }

    applyLivePreview(draft);
    return () => {
      clearLivePreview();
    };
  }, [applyLivePreview, clearLivePreview, draft, isActive]);
}
