import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./gallery-viewer.module.scss";
import type { BranchMedia } from "./types";

type GalleryViewerProps = {
  media: BranchMedia[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
};

export function GalleryViewer({
  media,
  index,
  onIndexChange,
  onClose,
}: GalleryViewerProps) {
  const item = media[index];
  const dialogRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const scaleForIndex = useRef(index);
  const pinchRef = useRef<{ startDist: number; startScale: number } | null>(
    null,
  );

  if (scaleForIndex.current !== index) {
    scaleForIndex.current = index;
    setScale(1);
  }

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
      if (event.key === "ArrowRight") {
        onIndexChange(Math.min(index + 1, media.length - 1));
      }
      if (event.key === "ArrowLeft") {
        onIndexChange(Math.max(index - 1, 0));
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [index, media.length, onClose, onIndexChange]);

  if (!item) {
    return null;
  }

  return createPortal(
    <div
      ref={dialogRef}
      className={styles.root}
      role="dialog"
      aria-modal="true"
      aria-label="Gallery viewer"
      tabIndex={-1}
    >
      <div className={styles.topBar}>
        <span className={styles.counter}>
          {index + 1} / {media.length}
        </span>
        <button type="button" className={styles.close} onClick={onClose}>
          Close
        </button>
      </div>

      <div
        className={styles.stage}
        onTouchStart={(event) => {
          if (item.kind !== "IMAGE" || event.touches.length !== 2) {
            return;
          }
          const [a, b] = [event.touches[0], event.touches[1]];
          if (!a || !b) return;
          const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
          pinchRef.current = { startDist: dist, startScale: scale };
        }}
        onTouchMove={(event) => {
          if (!pinchRef.current || event.touches.length !== 2) {
            return;
          }
          const [a, b] = [event.touches[0], event.touches[1]];
          if (!a || !b) return;
          const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
          const next =
            pinchRef.current.startScale *
            (dist / Math.max(pinchRef.current.startDist, 1));
          setScale(Math.min(3, Math.max(1, next)));
        }}
        onTouchEnd={() => {
          pinchRef.current = null;
        }}
      >
        {item.kind === "VIDEO" ? (
          <video
            className={styles.media}
            src={item.url}
            controls
            muted
            playsInline
            autoPlay
          />
        ) : (
          <img
            className={styles.media}
            src={item.url}
            alt={item.altText || item.caption || ""}
            style={{ transform: `scale(${scale})` }}
            draggable={false}
          />
        )}
      </div>

      {(item.caption || item.altText) && (
        <p className={styles.caption}>{item.caption || item.altText}</p>
      )}

      <div className={styles.nav}>
        <button
          type="button"
          className={styles.navBtn}
          disabled={index <= 0}
          onClick={() => onIndexChange(Math.max(index - 1, 0))}
        >
          Previous
        </button>
        <button
          type="button"
          className={styles.navBtn}
          disabled={index >= media.length - 1}
          onClick={() => onIndexChange(Math.min(index + 1, media.length - 1))}
        >
          Next
        </button>
      </div>
    </div>,
    document.body,
  );
}
