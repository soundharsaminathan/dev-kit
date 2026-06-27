import { type ThemeDraft, themeDraftToDefinition } from "@dev-ui/tokens";
import { type ReactNode, useEffect, useState } from "react";

export const LIVE_THEME_ID = "custom-live";

export function ThemeEditorDrawerMock({
  value,
  onChange,
  isOpen,
  defaultOpen,
  onOpenChange,
  onSave,
  onLivePreview,
  trigger,
  triggerLabel = "Edit theme",
  panelHeader,
  children,
}: {
  value: ThemeDraft;
  onChange: (value: ThemeDraft) => void;
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSave?: (draft: ThemeDraft) => void;
  onLivePreview?: (
    definition: ReturnType<typeof themeDraftToDefinition> | null,
  ) => void;
  trigger?: ReactNode | null;
  triggerLabel?: string;
  panelHeader?: ReactNode;
  children?: ReactNode;
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen ?? false);
  const open = isOpen ?? internalOpen;

  const setOpen = (next: boolean) => {
    if (isOpen === undefined) {
      setInternalOpen(next);
    }
    onOpenChange?.(next);
  };

  useEffect(() => {
    if (!onLivePreview) {
      return;
    }

    if (!open) {
      onLivePreview(null);
      return;
    }

    onLivePreview(themeDraftToDefinition(value, LIVE_THEME_ID));
  }, [open, onLivePreview, value]);

  return (
    <>
      {trigger === undefined ? (
        <button type="button" onClick={() => setOpen(true)}>
          {triggerLabel}
        </button>
      ) : (
        trigger
      )}
      {open ? (
        <div data-testid="theme-editor-drawer">
          <button
            type="button"
            aria-label="Close theme editor"
            onClick={() => setOpen(false)}
          >
            Close
          </button>
          <input
            aria-label="Theme name"
            value={value.label}
            onChange={(event) =>
              onChange({ ...value, label: event.target.value })
            }
          />
          <button type="button" onClick={() => onSave?.(value)}>
            Save theme
          </button>
          {panelHeader}
          {children}
        </div>
      ) : null}
    </>
  );
}
