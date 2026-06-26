import type { ThemeDefinition, ThemeDraft } from "@dev-ui/tokens";
import type { ReactNode } from "react";

export interface ThemeEditorPanelProps {
  value: ThemeDraft;
  onChange: (value: ThemeDraft) => void;
  className?: string;
}

/** @deprecated Use ThemeEditorPanel or ThemeEditorDrawer instead. */
export interface ThemeEditorProps extends ThemeEditorPanelProps {
  /** When set, injects live preview CSS for this theme id on `document.head`. */
  previewThemeId?: string;
  children?: ReactNode;
}

export interface ThemeEditorDrawerProps {
  value: ThemeDraft;
  onChange: (value: ThemeDraft) => void;
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSave?: (draft: ThemeDraft) => void;
  /** Wire to ThemeProvider `setLiveTheme` for app-wide live editing. */
  onLivePreview?: (definition: ThemeDefinition | null) => void;
  /** Omit for default button; pass `null` to hide the trigger. */
  trigger?: ReactNode | null;
  triggerLabel?: string;
  children?: ReactNode;
  className?: string;
}
