import { Button } from "@dev-ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@dev-ui/components/select";
import { ThemeEditorDrawer } from "@dev-ui/components/theme-editor";
import { packLibraries, resolveIconTheme } from "@dev-ui/icons";
import {
  createThemeDraft,
  definitionToThemeDraft,
  themeDraftToDefinition,
} from "@dev-ui/tokens";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { formatThemeLabel, useIcons, useTheme } from "@/lib/theme";
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
    themes,
    customThemes,
    saveCustomTheme,
    deleteCustomTheme,
    setTheme,
    setLiveTheme,
  } = useTheme();
  const { packId, setTheme: setIconTheme } = useIcons();

  const [draft, setDraft] = useState(() => createThemeDraft());
  const [editingId, setEditingId] = useState<string | undefined>();

  const syncDraftFromActiveTheme = useCallback(() => {
    const existing = customThemes.find((item) => item.id === activeTheme);
    if (existing) {
      setEditingId(existing.id);
      setDraft(definitionToThemeDraft(existing));
      return;
    }

    setEditingId(undefined);
    setDraft(createThemeDraft());
  }, [activeTheme, customThemes]);

  const hasSyncedInitialOpen = useRef(false);

  useEffect(() => {
    if (hasSyncedInitialOpen.current || !(defaultOpen || isOpen)) {
      return;
    }

    hasSyncedInitialOpen.current = true;
    syncDraftFromActiveTheme();
  }, [defaultOpen, isOpen, syncDraftFromActiveTheme]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        syncDraftFromActiveTheme();
      } else {
        setLiveTheme(null);
      }
      onOpenChange?.(open);
    },
    [onOpenChange, setLiveTheme, syncDraftFromActiveTheme],
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
      panelHeader={
        <>
          <Select
            className={styles.presetSelect}
            value={activeTheme}
            onChange={(key) => {
              if (key) setTheme(String(key));
            }}
            aria-label="Theme"
          >
            <SelectTrigger />
            <SelectContent>
              {themes.map((item) => (
                <SelectItem key={item.id} id={item.id}>
                  {formatThemeLabel(item.id, item.label)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            className={styles.presetSelect}
            value={packId}
            onChange={(key) => {
              if (key) setIconTheme(resolveIconTheme(String(key)));
            }}
            aria-label="Icon pack"
          >
            <SelectTrigger />
            <SelectContent>
              {packLibraries.map((pack) => (
                <SelectItem key={pack.id} id={pack.id}>
                  {pack.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      }
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
