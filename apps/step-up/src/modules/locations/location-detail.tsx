import { type ReactNode, useState } from "react";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import {
  LocationAmenities,
  LocationFaqs,
  LocationHours,
  LocationPricing,
  LocationTestimonials,
} from "./location-content";
import styles from "./location-detail.module.scss";
import { LocationGallery } from "./location-gallery";
import { LocationHero } from "./location-hero";
import { LocationMap } from "./location-map";
import { LocationSchedule } from "./location-schedule";
import { LocationTrainers } from "./location-trainers";
import type { BranchLanding } from "./types";

type LocationDetailProps = {
  landing: BranchLanding;
  layoutId?: string;
  batchLinkTo: (batchId: string) => string;
  trainerLinkTo?: (trainerId: string) => string;
  classesViewAllTo?: string;
  actions?: ReactNode;
  stickyCta?: ReactNode;
};

const CLASSES_PREVIEW_COUNT = 5;

export function LocationDetailSkeleton() {
  return (
    <div className={styles.skeleton}>
      <SkeletonBlock height="18rem" radius="0" />
      <div className={styles.skeletonBody}>
        <SkeletonBlock height="2rem" width="60%" />
        <SkeletonBlock height="1rem" width="80%" />
        <SkeletonBlock height="8rem" />
        <SkeletonBlock height="10rem" />
      </div>
    </div>
  );
}

export function LocationDetail({
  landing,
  layoutId,
  batchLinkTo,
  trainerLinkTo,
  classesViewAllTo,
  actions,
  stickyCta,
}: LocationDetailProps) {
  const [openGallery, setOpenGallery] = useState(false);
  const media = landing.media ?? [];

  return (
    <div className={styles.root} data-has-cta={stickyCta ? "true" : undefined}>
      <LocationHero
        branch={landing}
        {...(layoutId ? { layoutId } : {})}
        onOpenGallery={() => setOpenGallery(true)}
      />

      {actions ? <div className={styles.actions}>{actions}</div> : null}

      <div className={styles.sections}>
        {media.length > 0 ? (
          <LocationGallery
            media={media}
            openViewerOnMount={openGallery}
            onViewerClose={() => setOpenGallery(false)}
          />
        ) : null}

        <LocationSchedule
          batches={landing.batches}
          batchLinkTo={batchLinkTo}
          limit={CLASSES_PREVIEW_COUNT}
          {...(classesViewAllTo ? { viewAllTo: classesViewAllTo } : {})}
        />

        <LocationTrainers
          trainers={landing.trainers}
          {...(trainerLinkTo ? { trainerLinkTo } : {})}
        />

        <LocationAmenities amenities={landing.amenities} />
        <LocationHours hours={landing.openingHours} />
        <LocationPricing blurb={landing.pricingBlurb} />

        {landing.latitude !== null && landing.longitude !== null ? (
          <LocationMap
            latitude={landing.latitude}
            longitude={landing.longitude}
            name={landing.name}
            address={landing.address}
          />
        ) : null}

        <LocationTestimonials testimonials={landing.testimonials ?? []} />
        <LocationFaqs faqs={landing.faqs ?? []} />
      </div>

      {stickyCta}
    </div>
  );
}
