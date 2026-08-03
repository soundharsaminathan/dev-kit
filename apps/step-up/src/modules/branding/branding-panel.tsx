import { ThemeEditorPanel } from "@dev-ui/components/theme-editor";
import { useTheme } from "@dev-ui/core";
import { type ThemeDraft, themeDraftToDefinition } from "@dev-ui/tokens";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useApi } from "@/lib/api-context";
import { useStudioId } from "@/lib/use-studio-id";
import { uploadSocialPhoto } from "@/modules/social/upload";
import staff from "@/modules/ui/staff.module.scss";
import { ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import { brandThemeToDraft, draftToBrandTheme } from "./brand-theme";
import styles from "./branding-panel.module.scss";
import { useStudioBrandEdit } from "./studio-brand-edit-context";
import type { StudioBrandThemePayload } from "./types";

type BrandingPanelProps = {
  studioName: string;
  logoUrl?: string | null;
  brandTheme?: StudioBrandThemePayload | null;
};

export function BrandingPanel({
  studioName,
  logoUrl,
  brandTheme,
}: BrandingPanelProps) {
  const api = useApi();
  const studioId = useStudioId();
  const queryClient = useQueryClient();
  const { setLiveTheme, mode, setMode } = useTheme();
  const { setEditing } = useStudioBrandEdit();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<ThemeDraft>(() =>
    brandThemeToDraft(brandTheme, studioName),
  );
  const [logoError, setLogoError] = useState<string | null>(null);
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
    setLiveTheme(themeDraftToDefinition(draft, `studio-${studioId}`));
  }, [draft, setLiveTheme]);

  const invalidateStudio = () => {
    void queryClient.invalidateQueries({ queryKey: ["studio", studioId] });
    void queryClient.invalidateQueries({
      queryKey: ["studio-public", studioId],
    });
  };

  const uploadLogo = useMutation({
    mutationFn: async (file: File) => {
      const nextLogoUrl = await uploadSocialPhoto(api, file, "studio-logo");
      return api.patch(`/studios/${studioId}`, { logoUrl: nextLogoUrl });
    },
    onSuccess: () => {
      setLogoError(null);
      invalidateStudio();
    },
    onError: (error) => {
      setLogoError(
        error instanceof Error ? error.message : "Could not upload logo.",
      );
    },
  });

  const removeLogo = useMutation({
    mutationFn: () => api.patch(`/studios/${studioId}`, { logoUrl: null }),
    onSuccess: () => {
      setLogoError(null);
      invalidateStudio();
    },
    onError: (error) => {
      setLogoError(
        error instanceof Error ? error.message : "Could not remove logo.",
      );
    },
  });

  const saveTheme = useMutation({
    mutationFn: () =>
      api.patch(`/studios/${studioId}`, {
        brandTheme: draftToBrandTheme(draft),
      }),
    onSuccess: () => {
      setThemeError(null);
      invalidateStudio();
    },
    onError: (error) => {
      setThemeError(
        error instanceof Error ? error.message : "Could not save brand theme.",
      );
    },
  });

  const resetTheme = useMutation({
    mutationFn: () => api.patch(`/studios/${studioId}`, { brandTheme: null }),
    onSuccess: () => {
      setThemeError(null);
      setDraft(brandThemeToDraft(null, studioName));
      invalidateStudio();
    },
    onError: (error) => {
      setThemeError(
        error instanceof Error ? error.message : "Could not reset brand theme.",
      );
    },
  });

  return (
    <div className={staff.softPanel}>
      <p className={staff.panelTitle}>Branding</p>
      <p className={staff.panelDesc}>
        Logo and theme apply live across the studio app
      </p>

      <div className={styles.logoBlock}>
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={`${studioName} logo`}
            className={styles.logoPreview}
          />
        ) : null}
        <input
          ref={logoInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) uploadLogo.mutate(file);
            event.target.value = "";
          }}
        />
        <div className={styles.logoActions}>
          <TouchButton
            variant="default"
            fullWidth
            isPending={uploadLogo.isPending}
            onClick={() => logoInputRef.current?.click()}
          >
            {logoUrl ? "Replace logo" : "Upload logo"}
          </TouchButton>
          {logoUrl ? (
            <TouchButton
              variant="default"
              fullWidth
              isPending={removeLogo.isPending}
              onClick={() => removeLogo.mutate()}
            >
              Remove logo
            </TouchButton>
          ) : null}
        </div>
        {logoError ? <ErrorState description={logoError} /> : null}
      </div>

      <div className={styles.modeRow}>
        <p className={styles.modeLabel}>Preview mode: {mode}</p>
        <TouchButton
          variant="default"
          onClick={() => setMode(mode === "light" ? "dark" : "light")}
        >
          Switch to {mode === "light" ? "dark" : "light"}
        </TouchButton>
      </div>

      <ThemeEditorPanel value={draft} onChange={setDraft} />

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
  );
}
