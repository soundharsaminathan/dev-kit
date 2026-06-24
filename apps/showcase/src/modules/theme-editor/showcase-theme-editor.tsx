import { Button } from "@dev-ui/components/button";
import { ThemeEditorDrawer } from "@dev-ui/components/theme-editor";
import {
  createThemeDraft,
  definitionToThemeDraft,
  themeDraftToDefinition,
} from "@dev-ui/tokens";
import { type ReactNode, useCallback, useState } from "react";
import { formatThemeLabel, useTheme } from "@/lib/theme";
import styles from "./showcase-theme-editor.module.scss";

interface ShowcaseThemeEditorProps {
  defaultOpen?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode | null;
}

function ShowcaseThemeEditor({
  defaultOpen,
  isOpen,
  onOpenChange,
  trigger,
}: ShowcaseThemeEditorProps) {
  const {
    theme: activeTheme,
    customThemes,
    saveCustomTheme,
    deleteCustomTheme,
    setTheme,
    setLiveTheme,
  } = useTheme();

  const [draft, setDraft] = useState(() => createThemeDraft());
  const [editingId, setEditingId] = useState<string | undefined>();

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        const existing = customThemes.find((item) => item.id === activeTheme);
        if (existing) {
          setEditingId(existing.id);
          setDraft(definitionToThemeDraft(existing));
        } else {
          setEditingId(undefined);
          setDraft(createThemeDraft());
        }
      } else {
        setLiveTheme(null);
      }
      onOpenChange?.(open);
    },
    [activeTheme, customThemes, onOpenChange, setLiveTheme],
  );

  const handleSave = useCallback(() => {
    const saved = saveCustomTheme({
      ...(editingId ? { id: editingId } : {}),
      ...themeDraftToDefinition(draft, editingId ?? "draft"),
    });
    setEditingId(saved.id);
    setTheme(saved.id);
    setLiveTheme(null);
  }, [draft, editingId, saveCustomTheme, setLiveTheme, setTheme]);

  const loadCustom = useCallback(
    (themeId: string) => {
      const existing = customThemes.find((item) => item.id === themeId);
      if (!existing) return;
      setEditingId(existing.id);
      setDraft(definitionToThemeDraft(existing));
      setTheme(themeId);
    },
    [customThemes, setTheme],
  );

  return (
    <ThemeEditorDrawer
      value={draft}
      onChange={setDraft}
      {...(isOpen !== undefined ? { isOpen } : {})}
      {...(defaultOpen !== undefined ? { defaultOpen } : {})}
      onOpenChange={handleOpenChange}
      onSave={handleSave}
      onLivePreview={setLiveTheme}
      {...(trigger !== undefined ? { trigger } : {})}
      triggerLabel="Edit theme"
    >
      {customThemes.length > 0 ? (
        <div>
          <h3 className={styles.savedTitle}>Saved themes</h3>
          <ul className={styles.savedList}>
            {customThemes.map((item) => (
              <li key={item.id} className={styles.savedItem}>
                <Button
                  variant={activeTheme === item.id ? "primary" : "default"}
                  size="sm"
                  onClick={() => loadCustom(item.id)}
                >
                  {formatThemeLabel(item.id, item.label)}
                </Button>
                <Button
                  variant="quiet"
                  size="sm"
                  onClick={() => deleteCustomTheme(item.id)}
                >
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </ThemeEditorDrawer>
  );
}

export { ShowcaseThemeEditor };
