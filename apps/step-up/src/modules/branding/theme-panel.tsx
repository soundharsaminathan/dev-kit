import { ThemeColorPanel } from "@dev-ui/components/theme-editor";
import { useToastContext } from "@dev-ui/components/toast";
import { useTheme } from "@dev-ui/core";
import { Icon } from "@dev-ui/icons";
import { type ThemeDraft, themeDraftToDefinition } from "@dev-ui/tokens";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useLayoutEffect, useState } from "react";
import { useApi } from "@/lib/api-context";
import { useOptionalStudioId } from "@/lib/use-studio-id";
import staff from "@/modules/ui/staff.module.scss";
import { ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import { brandThemeToDraft, draftToBrandTheme } from "./brand-theme";
import styles from "./branding-panel.module.scss";
import { useStudioBrandEdit } from "./studio-brand-edit-context";
import type { StudioBrandThemePayload } from "./types";

type ThemePanelProps = {
  studioName: string;
  studioId?: string;
  brandTheme?: StudioBrandThemePayload | null | undefined;
};

export function ThemePanel({
  studioName,
  studioId: studioIdProp,
  brandTheme,
}: ThemePanelProps) {
  const api = useApi();
  const sessionStudioId = useOptionalStudioId();
  const studioId = studioIdProp ?? sessionStudioId ?? "";
  const queryClient = useQueryClient();
  const { toast } = useToastContext("ThemePanel");
  const { setLiveTheme, mode, setMode } = useTheme();
  const { setEditing } = useStudioBrandEdit();
  const [draft, setDraft] = useState<ThemeDraft>(() =>
    brandThemeToDraft(brandTheme, studioName),
  );
  const [themeError, setThemeError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(brandThemeToDraft(brandTheme, studioName));
  }, [brandTheme, studioName]);

  useEffect(() => {
    setEditing(true);
    return () => {
      setEditing(false);
    };
  }, [setEditing]);

  useLayoutEffect(() => {
    if (!studioId) return;
    setLiveTheme(themeDraftToDefinition(draft, `studio-${studioId}`));
  }, [draft, setLiveTheme, studioId]);

  const invalidateStudio = () => {
    if (!studioId) return;
    void queryClient.invalidateQueries({ queryKey: ["studio", studioId] });
    void queryClient.invalidateQueries({
      queryKey: ["studio-public", studioId],
    });
  };

  const cacheBrandTheme = (next: StudioBrandThemePayload | null) => {
    if (!studioId) return;
    queryClient.setQueryData(
      ["studio", studioId],
      (current: { brandTheme?: StudioBrandThemePayload | null } | undefined) =>
        current ? { ...current, brandTheme: next } : current,
    );
  };

  const saveTheme = useMutation({
    mutationFn: () =>
      api.patch(`/studios/${studioId}`, {
        brandTheme: draftToBrandTheme(draft),
      }),
    onSuccess: () => {
      setThemeError(null);
      cacheBrandTheme(draftToBrandTheme(draft));
      invalidateStudio();
      toast({
        title: "Theme saved",
        description: "Brand theme updated.",
        variant: "success",
      });
    },
    onError: (error) => {
      const description =
        error instanceof Error ? error.message : "Could not save brand theme.";
      setThemeError(description);
      toast({
        title: "Couldn’t save theme",
        description,
        variant: "error",
      });
    },
  });

  const resetTheme = useMutation({
    mutationFn: () => api.patch(`/studios/${studioId}`, { brandTheme: null }),
    onSuccess: () => {
      setThemeError(null);
      setDraft(brandThemeToDraft(null, studioName));
      cacheBrandTheme(null);
      invalidateStudio();
      toast({
        title: "Theme reset",
        description: "Brand theme restored to default.",
        variant: "success",
      });
    },
    onError: (error) => {
      const description =
        error instanceof Error ? error.message : "Could not reset brand theme.";
      setThemeError(description);
      toast({
        title: "Couldn’t reset theme",
        description,
        variant: "error",
      });
    },
  });

  if (!studioId) {
    return <ErrorState description="No studio selected for theme updates." />;
  }

  return (
    <div className={staff.softPanel}>
      <p className={staff.panelTitle}>Theme</p>
      <p className={staff.panelDesc}>
        Colors apply across the studio app for members and staff.
      </p>

      <div className={styles.themeSection}>
        <div className={styles.themeHeader}>
          <div>
            <p className={styles.themeSectionTitle}>Colors</p>
            <p className={styles.themeSectionDesc}>
              Pick your palette — buttons, surfaces, and text follow it
              everywhere.
            </p>
          </div>
          <fieldset className={styles.modeToggle} aria-label="Preview mode">
            {(["light", "dark"] as const).map((option) => (
              <button
                key={option}
                type="button"
                className={styles.modeOption}
                aria-label={option === "light" ? "Light" : "Dark"}
                aria-pressed={mode === option}
                data-selected={mode === option ? "true" : undefined}
                onClick={() => setMode(option)}
              >
                <Icon name={option === "light" ? "sun" : "moon"} />
              </button>
            ))}
          </fieldset>
        </div>

        <ThemeColorPanel value={draft} onChange={setDraft} />

        <div className={styles.themeActions}>
          <TouchButton
            variant="primary"
            fullWidth
            isPending={saveTheme.isPending}
            onClick={() => saveTheme.mutate()}
          >
            Save theme
          </TouchButton>
          <TouchButton
            variant="default"
            fullWidth
            isPending={resetTheme.isPending}
            onClick={() => resetTheme.mutate()}
          >
            Reset to Step Up defaults
          </TouchButton>
        </div>
        {themeError ? <ErrorState description={themeError} /> : null}
      </div>
    </div>
  );
}
