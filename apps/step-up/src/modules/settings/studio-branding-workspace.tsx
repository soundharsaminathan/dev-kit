import {
  Disclosure,
  DisclosurePanel,
  DisclosureTrigger,
} from "@dev-ui/components/disclosure";
import { Icon } from "@dev-ui/icons";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { BRAND_IMAGE_CROPS } from "@/modules/branding/brand-image-crops";
import { BrandingAssetSlot } from "@/modules/branding/branding-asset-slot";
import { useStudioBranding } from "@/modules/branding/use-studio-branding";
import { ImageCropSheet } from "@/modules/ui/image-crop-sheet";
import { marketplaceMissingMediaAlert } from "@/modules/marketplace/controls";
import { MarketplaceMediaAlertBanner } from "@/modules/marketplace/media-alert";
import { studioBrandingCompletion } from "./studio-branding-model";
import styles from "./studio-branding-workspace.module.scss";
import { StudioProfileCompletion } from "./studio-profile-preview";
import type { Studio } from "./types";

type StudioBrandingWorkspaceProps = {
  studio: Studio;
};

type PreviewMode = "mobile" | "desktop";

export function StudioBrandingWorkspace({
  studio,
}: StudioBrandingWorkspaceProps) {
  const branding = useStudioBranding(studio.id);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("mobile");
  const completion = studioBrandingCompletion({
    hasLogo: Boolean(studio.logoUrl),
    hasMobileHero: Boolean(studio.heroMobileUrl),
    hasDesktopHero: Boolean(studio.heroDesktopUrl),
  });
  const heroUrl =
    previewMode === "desktop"
      ? (studio.heroDesktopUrl ?? studio.heroMobileUrl)
      : (studio.heroMobileUrl ?? studio.heroDesktopUrl);

  const studioAlert = marketplaceMissingMediaAlert({
    kind: "STUDIO",
    objectId: studio.id,
    objectName: studio.name,
    heroDesktopUrl: studio.heroDesktopUrl,
    heroMobileUrl: studio.heroMobileUrl,
  });

  return (
    <>
      <MarketplaceMediaAlertBanner alert={studioAlert} />
      <div className={styles.workspace}>
        <div className={styles.editor}>
          <section className={styles.card}>
            <header className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Logo</h2>
              <p className={styles.cardHint}>
                Replaces the classa wordmark in the header and sidebar after
                login.
              </p>
            </header>
            <BrandingAssetSlot
              label="Studio logo"
              sizeHint={BRAND_IMAGE_CROPS.logo.sizeHint}
              url={studio.logoUrl ?? null}
              alt={`${studio.name} logo`}
              variant="logo"
              uploadLabel="Upload logo"
              replaceLabel="Replace logo"
              uploading={branding.uploadLogoPending}
              removing={branding.removeLogoPending}
              onFile={(file) => branding.openCrop("logo", file)}
              onRemove={branding.removeLogo}
              removeLabel="Remove logo"
            />
          </section>

          <section className={styles.card}>
            <header className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Member home hero</h2>
              <p className={styles.cardHint}>
                Fills the banner on the student home screen. Upload separate
                phone and desktop crops.
              </p>
            </header>
            <div className={styles.heroGrid}>
              <BrandingAssetSlot
                label="Mobile"
                sizeHint={BRAND_IMAGE_CROPS.heroMobile.sizeHint}
                url={studio.heroMobileUrl ?? null}
                alt={`${studio.name} mobile hero`}
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
                url={studio.heroDesktopUrl ?? null}
                alt={`${studio.name} desktop hero`}
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
          </section>

          <Disclosure className={styles.expandable}>
            <DisclosureTrigger className={styles.expandTrigger}>
              <span className={styles.expandCopy}>
                <span className={styles.cardTitle}>Where this appears</span>
                <span className={styles.cardHint}>
                  Header, member home, and public studio page
                </span>
              </span>
              <span className={styles.expandStatus}>Guide</span>
            </DisclosureTrigger>
            <DisclosurePanel className={styles.expandPanel}>
              <ul className={styles.usageList}>
                <li>
                  <Icon name="image" />
                  <span>
                    Logo sits in the app header and sidebar in place of the
                    classa wordmark.
                  </span>
                </li>
                <li>
                  <Icon name="smartphone" />
                  <span>Mobile hero is the student home banner on phones.</span>
                </li>
                <li>
                  <Icon name="monitor" />
                  <span>
                    Desktop hero is the wider home banner on larger screens.
                  </span>
                </li>
              </ul>
              <p className={styles.hint}>
                Public profile photos still live on each{" "}
                <Link to="/app/locations" className={styles.inlineLink}>
                  location
                </Link>
                . Studio name and tagline are on{" "}
                <Link to="/app/settings/profile" className={styles.inlineLink}>
                  Profile
                </Link>
                .
              </p>
            </DisclosurePanel>
          </Disclosure>

          {branding.logoError ? (
            <p className={styles.error}>{branding.logoError}</p>
          ) : null}
          {branding.heroError ? (
            <p className={styles.error}>{branding.heroError}</p>
          ) : null}
        </div>

        <aside className={styles.rail}>
          <article
            className={styles.preview}
            data-testid="studio-branding-preview"
          >
            <header className={styles.previewHeader}>
              <Icon name="eye" />
              <div>
                <h2 className={styles.previewTitle}>Member home preview</h2>
                <p className={styles.previewHint}>
                  This is how your brand appears to students after login.
                </p>
              </div>
            </header>

            <fieldset className={styles.modeToggle}>
              <legend className={styles.srOnly}>Preview size</legend>
              <button
                type="button"
                className={styles.modeOption}
                data-selected={previewMode === "mobile" ? "true" : undefined}
                onClick={() => setPreviewMode("mobile")}
              >
                Mobile
              </button>
              <button
                type="button"
                className={styles.modeOption}
                data-selected={previewMode === "desktop" ? "true" : undefined}
                onClick={() => setPreviewMode("desktop")}
              >
                Desktop
              </button>
            </fieldset>

            <div className={styles.device} data-mode={previewMode}>
              <div className={styles.deviceChrome}>
                {studio.logoUrl ? (
                  <img
                    src={studio.logoUrl}
                    alt=""
                    className={styles.deviceLogo}
                  />
                ) : (
                  <span className={styles.wordmark}>classa</span>
                )}
                <span className={styles.chromeIcon} aria-hidden>
                  <Icon name="bell" />
                </span>
              </div>
              <div className={styles.banner} data-mode={previewMode}>
                {heroUrl ? (
                  <img src={heroUrl} alt="" />
                ) : (
                  <div className={styles.bannerFallback} aria-hidden />
                )}
                <div className={styles.bannerScrim} aria-hidden />
                <div className={styles.bannerCopy}>
                  <p className={styles.bannerEyebrow}>{studio.name}</p>
                  <p className={styles.bannerTitle}>
                    Hey, dancer — let's dance
                  </p>
                </div>
              </div>
              <div className={styles.deviceBody}>
                <div className={styles.fakeCard}>
                  <span>Next class</span>
                  <strong>Today · 6:30 PM</strong>
                </div>
                <div className={styles.fakeCard}>
                  <span>Book</span>
                  <strong>Find a class</strong>
                </div>
              </div>
            </div>
          </article>

          <StudioProfileCompletion
            title="Branding completion"
            percent={completion.percent}
            items={completion.items}
          />
        </aside>
      </div>
      <ImageCropSheet
        file={branding.pendingCrop?.file ?? null}
        aspect={branding.cropConfig.aspect}
        cropShape={branding.cropConfig.cropShape}
        title={branding.cropConfig.title}
        busy={branding.cropBusy}
        onCancel={branding.cancelCrop}
        onCropDone={branding.handleCropDone}
      />
    </>
  );
}
