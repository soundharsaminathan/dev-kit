import { Icon } from "@dev-ui/icons";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import styles from "./location-hero.module.scss";
import { type BranchLanding, type BranchMedia, mapsUrl } from "./types";

type LocationHeroProps = {
  branch: BranchLanding | (BranchLanding & object);
  layoutId?: string;
  onOpenGallery?: () => void;
};

function HeroMedia({
  media,
  layoutId,
  alt,
}: {
  media: BranchMedia | null;
  layoutId?: string;
  alt: string;
}) {
  const reducedMotion = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || media?.kind !== "VIDEO") {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          void video.play().catch(() => undefined);
        } else {
          video.pause();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [media?.kind]);

  if (!media) {
    return <div className={styles.fallback} aria-hidden />;
  }

  if (media.kind === "VIDEO") {
    return (
      <video
        ref={videoRef}
        className={styles.media}
        src={media.url}
        muted
        playsInline
        loop
        preload="metadata"
        aria-label={media.altText || alt}
      />
    );
  }

  return (
    <motion.img
      {...(reducedMotion || !layoutId ? {} : { layoutId })}
      className={styles.media}
      src={media.url}
      alt={media.altText || alt}
      loading="eager"
    />
  );
}

export function LocationHero({
  branch,
  layoutId,
  onOpenGallery,
}: LocationHeroProps) {
  const cover =
    branch.coverMedia ??
    branch.media?.find((item) => item.kind === "IMAGE") ??
    branch.media?.[0] ??
    null;
  const hasCoords = branch.latitude !== null && branch.longitude !== null;

  return (
    <section className={styles.hero}>
      <button
        type="button"
        className={styles.mediaButton}
        onClick={onOpenGallery}
        aria-label="Open gallery"
      >
        <HeroMedia
          media={cover}
          {...(layoutId ? { layoutId } : {})}
          alt={branch.name}
        />
        <div className={styles.scrim} />
      </button>

      <div className={styles.content}>
        <div className={styles.titles}>
          <h1 className={styles.title}>{branch.name}</h1>
          {branch.ratingAvg != null && branch.ratingCount > 0 ? (
            <p className={styles.rating}>
              <Icon name="star" className={styles.star} />
              {branch.ratingAvg.toFixed(1)}
              <span className={styles.ratingCount}>({branch.ratingCount})</span>
            </p>
          ) : null}
        </div>
        <p className={styles.address}>{branch.address}</p>
        {branch.description ? (
          <p className={styles.description}>{branch.description}</p>
        ) : null}
        {hasCoords ? (
          <a
            className={styles.directions}
            href={mapsUrl(branch.latitude!, branch.longitude!)}
            target="_blank"
            rel="noreferrer"
          >
            <Icon name="map-pin" />
            Get directions
          </a>
        ) : null}
      </div>
    </section>
  );
}
