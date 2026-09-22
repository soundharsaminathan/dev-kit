import { useOptionalStudioId } from "@/lib/use-studio-id";
import { ImageCropSheet } from "@/modules/ui/image-crop-sheet";
import { ErrorState } from "@/modules/ui/states";
import { BRAND_IMAGE_CROPS } from "./brand-image-crops";
import { BrandingAssetSlot } from "./branding-asset-slot";
import styles from "./branding-panel.module.scss";
import { useStudioBranding } from "./use-studio-branding";

type BrandingPanelProps = {
  studioName: string;
  studioId?: string;
  logoUrl?: string | null | undefined;
  heroMobileUrl?: string | null | undefined;
  heroDesktopUrl?: string | null | undefined;
  embedded?: boolean;
};

export function BrandingPanel({
  studioName,
  studioId: studioIdProp,
  logoUrl,
  heroMobileUrl,
  heroDesktopUrl,
  embedded = false,
}: BrandingPanelProps) {
  const sessionStudioId = useOptionalStudioId();
  const studioId = studioIdProp ?? sessionStudioId ?? "";
  const branding = useStudioBranding(studioId);

  if (!studioId) {
    return (
      <ErrorState description="No studio selected for branding updates." />
    );
  }

  return (
    <div className={embedded ? styles.stack : styles.panel}>
      {embedded ? null : (
        <p className={styles.intro}>
          Logo replaces the classa wordmark after login. Hero images fill the
          member home banner.
        </p>
      )}

      <BrandingAssetSlot
        label="Logo"
        sizeHint={BRAND_IMAGE_CROPS.logo.sizeHint}
        url={logoUrl ?? null}
        alt={`${studioName} logo`}
        variant="logo"
        uploadLabel="Upload logo"
        replaceLabel="Replace logo"
        uploading={branding.uploadLogoPending}
        removing={branding.removeLogoPending}
        onFile={(file) => branding.openCrop("logo", file)}
        onRemove={branding.removeLogo}
        removeLabel="Remove logo"
      />

      <div className={styles.heroGrid}>
        <BrandingAssetSlot
          label="Mobile"
          sizeHint={BRAND_IMAGE_CROPS.heroMobile.sizeHint}
          url={heroMobileUrl ?? null}
          alt={`${studioName} mobile hero`}
          variant="mobile"
          uploadLabel="Upload mobile"
          replaceLabel="Replace mobile"
          uploading={branding.heroUploadingSlot === "heroMobileUrl"}
          removing={branding.heroRemovingSlot === "heroMobileUrl"}
          onFile={(file) => branding.openCrop("heroMobile", file)}
          onRemove={() => branding.removeHero("heroMobileUrl")}
          uploadTestId="upload-hero-mobile"
          removeTestId="remove-hero-mobile"
        />
        <BrandingAssetSlot
          label="Desktop"
          sizeHint={BRAND_IMAGE_CROPS.heroDesktop.sizeHint}
          url={heroDesktopUrl ?? null}
          alt={`${studioName} desktop hero`}
          variant="desktop"
          uploadLabel="Upload desktop"
          replaceLabel="Replace desktop"
          uploading={branding.heroUploadingSlot === "heroDesktopUrl"}
          removing={branding.heroRemovingSlot === "heroDesktopUrl"}
          onFile={(file) => branding.openCrop("heroDesktop", file)}
          onRemove={() => branding.removeHero("heroDesktopUrl")}
          uploadTestId="upload-hero-desktop"
          removeTestId="remove-hero-desktop"
        />
      </div>

      {branding.logoError ? (
        <ErrorState description={branding.logoError} />
      ) : null}
      {branding.heroError ? (
        <ErrorState description={branding.heroError} />
      ) : null}

      <ImageCropSheet
        file={branding.pendingCrop?.file ?? null}
        aspect={branding.cropConfig.aspect}
        cropShape={branding.cropConfig.cropShape}
        title={branding.cropConfig.title}
        busy={branding.cropBusy}
        onCancel={branding.cancelCrop}
        onCropDone={branding.handleCropDone}
      />
    </div>
  );
}
