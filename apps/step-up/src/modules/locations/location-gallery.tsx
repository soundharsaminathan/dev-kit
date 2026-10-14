import { useEffect, useRef, useState } from "react";
import { GalleryViewer } from "./gallery-viewer";
import styles from "./location-gallery.module.scss";
import {
  type BranchMedia,
  type BranchMediaCategory,
  MEDIA_CATEGORY_LABELS,
} from "./types";

type LocationGalleryProps = {
  media: BranchMedia[];
  initialIndex?: number;
  openViewerOnMount?: boolean;
  onViewerClose?: () => void;
};

function GallerySlide({
  item,
  active,
  onOpen,
}: {
  item: BranchMedia;
  active: boolean;
  onOpen: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || item.kind !== "VIDEO") {
      return;
    }
    if (active) {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, [active, item.kind]);

  return (
    <button
      type="button"
      className={styles.slide}
      onClick={onOpen}
      aria-label={item.caption || item.altText || "Open media"}
    >
      {item.kind === "VIDEO" ? (
        <video
          ref={videoRef}
          className={styles.media}
          src={item.url}
          muted
          playsInline
          loop
          preload="metadata"
        />
      ) : (
        <img
          className={styles.media}
          src={item.url}
          alt={item.altText || ""}
          loading="lazy"
        />
      )}
      {item.kind === "VIDEO" ? (
        <span className={styles.videoBadge}>Video</span>
      ) : null}
    </button>
  );
}

export function LocationGallery({
  media,
  initialIndex = 0,
  openViewerOnMount = false,
  onViewerClose,
}: LocationGalleryProps) {
  const [index, setIndex] = useState(initialIndex);
  const [category, setCategory] = useState<BranchMediaCategory | "ALL">("ALL");
  const [viewerOpen, setViewerOpen] = useState(openViewerOnMount);
  const trackRef = useRef<HTMLDivElement>(null);

  const filtered =
    category === "ALL"
      ? media
      : media.filter((item) => item.category === category);

  const categories = Array.from(
    new Set(media.map((item) => item.category)),
  ) as BranchMediaCategory[];

  useEffect(() => {
    if (openViewerOnMount) {
      setViewerOpen(true);
    }
  }, [openViewerOnMount]);

  function selectCategory(next: BranchMediaCategory | "ALL") {
    setCategory(next);
    setIndex(0);
  }

  if (media.length === 0) {
    return null;
  }

  const safeIndex = Math.min(index, Math.max(filtered.length - 1, 0));

  return (
    <section
      className={styles.root}
      aria-roledescription="carousel"
      aria-label="Studio gallery"
    >
      {categories.length > 1 ? (
        <div
          className={styles.chips}
          role="tablist"
          aria-label="Media categories"
        >
          <button
            type="button"
            className={styles.chip}
            data-active={category === "ALL" ? "true" : undefined}
            onClick={() => selectCategory("ALL")}
          >
            All
          </button>
          {categories.map((id) => (
            <button
              key={id}
              type="button"
              className={styles.chip}
              data-active={category === id ? "true" : undefined}
              onClick={() => selectCategory(id)}
            >
              {MEDIA_CATEGORY_LABELS[id]}
            </button>
          ))}
        </div>
      ) : null}

      <div ref={trackRef} className={styles.track}>
        <div
          className={styles.rail}
          style={{
            transform: `translateX(calc(-${safeIndex} * 100%))`,
          }}
        >
          {filtered.map((item, itemIndex) => (
            <div key={item.id} className={styles.slideWrap}>
              <GallerySlide
                item={item}
                active={itemIndex === safeIndex}
                onOpen={() => {
                  setIndex(itemIndex);
                  setViewerOpen(true);
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className={styles.controls}>
        <button
          type="button"
          className={styles.navBtn}
          aria-label="Previous media"
          disabled={safeIndex <= 0}
          onClick={() => setIndex((current) => Math.max(current - 1, 0))}
        >
          Prev
        </button>
        <span className={styles.counter} aria-live="polite">
          {filtered.length === 0 ? 0 : safeIndex + 1} / {filtered.length}
        </span>
        <button
          type="button"
          className={styles.navBtn}
          aria-label="Next media"
          disabled={safeIndex >= filtered.length - 1}
          onClick={() =>
            setIndex((current) => Math.min(current + 1, filtered.length - 1))
          }
        >
          Next
        </button>
      </div>

      {viewerOpen && filtered.length > 0 ? (
        <GalleryViewer
          media={filtered}
          index={safeIndex}
          onIndexChange={setIndex}
          onClose={() => {
            setViewerOpen(false);
            onViewerClose?.();
          }}
        />
      ) : null}
    </section>
  );
}
