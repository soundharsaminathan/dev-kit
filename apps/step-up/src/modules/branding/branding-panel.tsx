import { ThemeColorPanel } from "@dev-ui/components/theme-editor";
import { useToastContext } from "@dev-ui/components/toast";
import { useTheme } from "@dev-ui/core";
import { type ThemeDraft, themeDraftToDefinition } from "@dev-ui/tokens";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useApi } from "@/lib/api-context";
import { useOptionalStudioId } from "@/lib/use-studio-id";
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
  studioId?: string;
  logoUrl?: string | null | undefined;
  heroMobileUrl?: string | null | undefined;
  heroDesktopUrl?: string | null | undefined;
  brandTheme?: StudioBrandThemePayload | null | undefined;
  /** When false, only logo/hero uploads are shown (theme edited elsewhere). */
  showTheme?: boolean;
};

type HeroSlot = "heroMobileUrl" | "heroDesktopUrl";

export function BrandingPanel({
  studioName,
  studioId: studioIdProp,
  logoUrl,
  heroMobileUrl,
  heroDesktopUrl,
  brandTheme,
  showTheme = true,
}: BrandingPanelProps) {
  const api = useApi();
  const sessionStudioId = useOptionalStudioId();
  const studioId = studioIdProp ?? sessionStudioId ?? "";
  const queryClient = useQueryClient();
  const { toast } = useToastContext("BrandingPanel");
  const { setLiveTheme, mode, setMode } = useTheme();
  const { setEditing } = useStudioBrandEdit();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const mobileHeroInputRef = useRef<HTMLInputElement>(null);
  const desktopHeroInputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<ThemeDraft>(() =>
    brandThemeToDraft(brandTheme, studioName),
  );
  const [logoError, setLogoError] = useState<string | null>(null);
  const [heroError, setHeroError] = useState<string | null>(null);
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
    if (!showTheme || !studioId) return;
    setLiveTheme(themeDraftToDefinition(draft, `studio-${studioId}`));
  }, [draft, setLiveTheme, showTheme, studioId]);

  const invalidateStudio = () => {
    if (!studioId) return;
    void queryClient.invalidateQueries({ queryKey: ["studio", studioId] });
    void queryClient.invalidateQueries({
      queryKey: ["studio-public", studioId],
    });
    void queryClient.invalidateQueries({ queryKey: ["home"] });
  };

  const uploadLogo = useMutation({
    mutationFn: async (file: File) => {
      const nextLogoUrl = await uploadSocialPhoto(api, file, "studio-logo");
      return api.patch(`/studios/${studioId}`, { logoUrl: nextLogoUrl });
    },
    onSuccess: () => {
      setLogoError(null);
      invalidateStudio();
      toast({
        title: "Logo uploaded",
        description: "Studio logo updated.",
        variant: "success",
      });
    },
    onError: (error) => {
      const description =
        error instanceof Error ? error.message : "Could not upload logo.";
      setLogoError(description);
      toast({
        title: "Couldn’t upload logo",
        description,
        variant: "error",
      });
    },
  });

  const removeLogo = useMutation({
    mutationFn: () => api.patch(`/studios/${studioId}`, { logoUrl: null }),
    onSuccess: () => {
      setLogoError(null);
      invalidateStudio();
      toast({
        title: "Logo removed",
        description: "Studio logo cleared.",
        variant: "success",
      });
    },
    onError: (error) => {
      const description =
        error instanceof Error ? error.message : "Could not remove logo.";
      setLogoError(description);
      toast({
        title: "Couldn’t remove logo",
        description,
        variant: "error",
      });
    },
  });

  const uploadHero = useMutation({
    mutationFn: async ({ slot, file }: { slot: HeroSlot; file: File }) => {
      const nextUrl = await uploadSocialPhoto(api, file, "studio-hero");
      return api.patch(`/studios/${studioId}`, { [slot]: nextUrl });
    },
    onSuccess: (_result, variables) => {
      setHeroError(null);
      invalidateStudio();
      toast({
        title: "Hero image uploaded",
        description:
          variables.slot === "heroMobileUrl"
            ? "Mobile hero updated for the member home screen."
            : "Desktop hero updated for the member home screen.",
        variant: "success",
      });
    },
    onError: (error) => {
      const description =
        error instanceof Error ? error.message : "Could not upload hero image.";
      setHeroError(description);
      toast({
        title: "Couldn’t upload hero",
        description,
        variant: "error",
      });
    },
  });

  const removeHero = useMutation({
    mutationFn: (slot: HeroSlot) =>
      api.patch(`/studios/${studioId}`, { [slot]: null }),
    onSuccess: (_result, slot) => {
      setHeroError(null);
      invalidateStudio();
      toast({
        title: "Hero image removed",
        description:
          slot === "heroMobileUrl"
            ? "Mobile hero cleared."
            : "Desktop hero cleared.",
        variant: "success",
      });
    },
    onError: (error) => {
      const description =
        error instanceof Error ? error.message : "Could not remove hero image.";
      setHeroError(description);
      toast({
        title: "Couldn’t remove hero",
        description,
        variant: "error",
      });
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

  const heroUploadingSlot =
    uploadHero.isPending && uploadHero.variables
      ? uploadHero.variables.slot
      : null;
  const heroRemovingSlot =
    removeHero.isPending && removeHero.variables ? removeHero.variables : null;

  if (!studioId) {
    return (
      <ErrorState description="No studio selected for branding updates." />
    );
  }

  return (
    <div className={staff.softPanel}>
      <p className={staff.panelTitle}>Branding</p>
      <p className={staff.panelDesc}>
        {showTheme
          ? "Logo, hero images, and theme apply across the studio app"
          : "Logo and hero images apply across the studio app"}
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

      <div className={styles.heroSection}>
        <p className={styles.heroSectionTitle}>Member home hero</p>
        <p className={styles.heroSectionDesc}>
          Shown at the top of the /me home screen. Upload separate crops for
          phone and desktop when you can.
        </p>

        <div className={styles.heroGrid}>
          <div className={styles.heroBlock}>
            <p className={styles.heroLabel}>Mobile</p>
            {heroMobileUrl ? (
              <img
                src={heroMobileUrl}
                alt={`${studioName} mobile hero`}
                className={styles.heroPreview}
                data-slot="mobile"
              />
            ) : (
              <div className={styles.heroPlaceholder} data-slot="mobile" />
            )}
            <input
              ref={mobileHeroInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  uploadHero.mutate({ slot: "heroMobileUrl", file });
                }
                event.target.value = "";
              }}
            />
            <div className={styles.logoActions}>
              <TouchButton
                variant="default"
                fullWidth
                isPending={heroUploadingSlot === "heroMobileUrl"}
                data-testid="upload-hero-mobile"
                onClick={() => mobileHeroInputRef.current?.click()}
              >
                {heroMobileUrl ? "Replace mobile" : "Upload mobile"}
              </TouchButton>
              {heroMobileUrl ? (
                <TouchButton
                  variant="default"
                  fullWidth
                  isPending={heroRemovingSlot === "heroMobileUrl"}
                  data-testid="remove-hero-mobile"
                  onClick={() => removeHero.mutate("heroMobileUrl")}
                >
                  Remove
                </TouchButton>
              ) : null}
            </div>
          </div>

          <div className={styles.heroBlock}>
            <p className={styles.heroLabel}>Desktop</p>
            {heroDesktopUrl ? (
              <img
                src={heroDesktopUrl}
                alt={`${studioName} desktop hero`}
                className={styles.heroPreview}
                data-slot="desktop"
              />
            ) : (
              <div className={styles.heroPlaceholder} data-slot="desktop" />
            )}
            <input
              ref={desktopHeroInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  uploadHero.mutate({ slot: "heroDesktopUrl", file });
                }
                event.target.value = "";
              }}
            />
            <div className={styles.logoActions}>
              <TouchButton
                variant="default"
                fullWidth
                isPending={heroUploadingSlot === "heroDesktopUrl"}
                data-testid="upload-hero-desktop"
                onClick={() => desktopHeroInputRef.current?.click()}
              >
                {heroDesktopUrl ? "Replace desktop" : "Upload desktop"}
              </TouchButton>
              {heroDesktopUrl ? (
                <TouchButton
                  variant="default"
                  fullWidth
                  isPending={heroRemovingSlot === "heroDesktopUrl"}
                  data-testid="remove-hero-desktop"
                  onClick={() => removeHero.mutate("heroDesktopUrl")}
                >
                  Remove
                </TouchButton>
              ) : null}
            </div>
          </div>
        </div>
        {heroError ? <ErrorState description={heroError} /> : null}
      </div>

      {showTheme ? (
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
                  aria-pressed={mode === option}
                  data-selected={mode === option ? "true" : undefined}
                  onClick={() => setMode(option)}
                >
                  {option === "light" ? "Light" : "Dark"}
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
      ) : null}
    </div>
  );
}
