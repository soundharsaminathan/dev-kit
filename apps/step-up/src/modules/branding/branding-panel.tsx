import { useToastContext } from "@dev-ui/components/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useApi } from "@/lib/api-context";
import { useOptionalStudioId } from "@/lib/use-studio-id";
import { uploadSocialPhoto } from "@/modules/social/upload";
import { ImageCropSheet } from "@/modules/ui/image-crop-sheet";
import staff from "@/modules/ui/staff.module.scss";
import { ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import { BRAND_IMAGE_CROPS, type BrandImageKind } from "./brand-image-crops";
import styles from "./branding-panel.module.scss";

type BrandingPanelProps = {
  studioName: string;
  studioId?: string;
  logoUrl?: string | null | undefined;
  heroMobileUrl?: string | null | undefined;
  heroDesktopUrl?: string | null | undefined;
};

type HeroSlot = "heroMobileUrl" | "heroDesktopUrl";

type PendingCrop = {
  file: File;
  kind: BrandImageKind;
};

export function BrandingPanel({
  studioName,
  studioId: studioIdProp,
  logoUrl,
  heroMobileUrl,
  heroDesktopUrl,
}: BrandingPanelProps) {
  const api = useApi();
  const sessionStudioId = useOptionalStudioId();
  const studioId = studioIdProp ?? sessionStudioId ?? "";
  const queryClient = useQueryClient();
  const { toast } = useToastContext("BrandingPanel");
  const logoInputRef = useRef<HTMLInputElement>(null);
  const mobileHeroInputRef = useRef<HTMLInputElement>(null);
  const desktopHeroInputRef = useRef<HTMLInputElement>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [heroError, setHeroError] = useState<string | null>(null);
  const [pendingCrop, setPendingCrop] = useState<PendingCrop | null>(null);

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
      setPendingCrop(null);
      invalidateStudio();
      toast({
        title: "Logo uploaded",
        description: "Studio logo updated.",
        variant: "success",
      });
    },
    onError: (error: unknown) => {
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
    onError: (error: unknown) => {
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
      setPendingCrop(null);
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
    onError: (error: unknown) => {
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
    onError: (error: unknown) => {
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

  function openCrop(kind: BrandImageKind, file: File) {
    setPendingCrop({ kind, file });
  }

  function handleCropDone(file: File) {
    if (!pendingCrop) return;
    if (pendingCrop.kind === "logo") {
      uploadLogo.mutate(file);
      return;
    }
    uploadHero.mutate({
      slot:
        pendingCrop.kind === "heroMobile" ? "heroMobileUrl" : "heroDesktopUrl",
      file,
    });
  }

  const heroUploadingSlot =
    uploadHero.isPending && uploadHero.variables
      ? uploadHero.variables.slot
      : null;
  const heroRemovingSlot =
    removeHero.isPending && removeHero.variables ? removeHero.variables : null;
  const cropBusy =
    uploadLogo.isPending ||
    (uploadHero.isPending &&
      pendingCrop != null &&
      pendingCrop.kind !== "logo");
  const cropConfig = pendingCrop
    ? BRAND_IMAGE_CROPS[pendingCrop.kind]
    : BRAND_IMAGE_CROPS.logo;

  if (!studioId) {
    return (
      <ErrorState description="No studio selected for branding updates." />
    );
  }

  return (
    <div className={staff.softPanel}>
      <p className={staff.panelTitle}>Branding</p>
      <p className={staff.panelDesc}>
        Logo replaces the Step Up wordmark after login. Hero images fill the
        member home banner.
      </p>

      <div className={styles.logoBlock}>
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={`${studioName} logo`}
            className={styles.logoPreview}
          />
        ) : null}
        <p className={styles.assetHint}>
          Wordmark crop · {BRAND_IMAGE_CROPS.logo.sizeHint}
        </p>
        <input
          ref={logoInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) openCrop("logo", file);
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
          Cropped to match the /me home banner. Upload separate phone and
          desktop images.
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
            <p className={styles.assetHint}>
              {BRAND_IMAGE_CROPS.heroMobile.sizeHint}
            </p>
            <input
              ref={mobileHeroInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) openCrop("heroMobile", file);
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
            <p className={styles.assetHint}>
              {BRAND_IMAGE_CROPS.heroDesktop.sizeHint}
            </p>
            <input
              ref={desktopHeroInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) openCrop("heroDesktop", file);
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

      <ImageCropSheet
        file={pendingCrop?.file ?? null}
        aspect={cropConfig.aspect}
        cropShape={cropConfig.cropShape}
        title={cropConfig.title}
        busy={cropBusy}
        onCancel={() => {
          if (!cropBusy) setPendingCrop(null);
        }}
        onCropDone={handleCropDone}
      />
    </div>
  );
}
