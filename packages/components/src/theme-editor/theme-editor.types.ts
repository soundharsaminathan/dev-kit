import type { ThemeDefinition, ThemeDraft } from "@dev-ui/tokens";
import type { ReactNode } from "react";

export interface ThemeEditorPanelProps {
  value: ThemeDraft;
  onChange: (value: ThemeDraft) => void;
  className?: string;
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
  /** Rendered above the editor panel in the drawer body. */
  panelHeader?: ReactNode;
  children?: ReactNode;
  className?: string;
}
